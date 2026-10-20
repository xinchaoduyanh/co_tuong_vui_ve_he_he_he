package com.chessxiangqi.xiangqi_backend.service.ai;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.EngineException;
import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.Line;
import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.SearchLimit;
import com.chessxiangqi.xiangqi_backend.util.XiangqiNotation;
import com.chessxiangqi.xiangqi_backend.util.XiangqiRules;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

/**
 * Chọn nước đi cho máy theo độ khó 1-5. Giữ một nhóm engine (tối đa {@code pool-size} tiến trình, tạo khi cần);
 * hết slot thì chờ một lúc rồi báo bận. Nước engine trả về luôn được đối chiếu với {@link XiangqiRules#legalMoves}.
 */
@Slf4j
@Service
public class EngineMoveService {

    public static final int MIN_LEVEL = 1;
    public static final int MAX_LEVEL = 5;

    private static final long ACQUIRE_TIMEOUT_MS = 30_000;

    /** Mức khó: giới hạn tìm kiếm, số nước gợi ý và xác suất chọn nước không phải tốt nhất. */
    record Level(String name, Integer depth, Integer movetimeMs, int multiPv, double altChance, int altFrom, int altTo) {
        SearchLimit limit() {
            return new SearchLimit(depth, movetimeMs);
        }
    }

    // altFrom..altTo là chỉ số (0 = tốt nhất) trong danh sách gợi ý để chọn ngẫu nhiên khi "đi dở"
    private static final Level[] LEVELS = {
        new Level("Tập sự", 1, null, 4, 0.40, 0, 3),
        new Level("Dễ", 3, null, 3, 0.25, 1, 2),
        new Level("Trung bình", 6, null, 2, 0.10, 1, 1),
        new Level("Khó", null, 500, 1, 0, 0, 0),
        new Level("Đại kiện tướng", null, 2000, 1, 0, 0, 0),
    };

    public static class EngineBusyException extends Exception {
        public EngineBusyException() {
            super("Máy đang bận");
        }
    }

    private final Supplier<AiEngine> factory;
    private final int poolSize;
    private final Random random;
    private final boolean available;

    private final BlockingQueue<AiEngine> idle = new LinkedBlockingQueue<>();
    private final List<AiEngine> all = new ArrayList<>();
    private final AtomicInteger created = new AtomicInteger();

    @Autowired
    public EngineMoveService(
        @Value("${ai.engine.path}") String path,
        @Value("${ai.engine.nnue}") String nnue,
        @Value("${ai.engine.pool-size:2}") int poolSize,
        @Value("${ai.engine.threads:1}") int threads,
        @Value("${ai.engine.hash-mb:32}") int hashMb
    ) {
        Path binary = Path.of(path);
        Path net = Path.of(nnue);
        this.factory = () -> new UciEngineClient(binary, net, threads, hashMb);
        this.poolSize = Math.max(1, poolSize);
        this.random = new Random();
        this.available = Files.isExecutable(binary) && Files.isRegularFile(net);
        if (!available) {
            log.warn("[AI] Không tìm thấy engine ({} / {}): chế độ đánh với máy bị tắt. Xem ai.engine.* trong application.properties", path, nnue);
        }
    }

    /** Dùng cho test: engine tự dựng, luôn coi là có sẵn. */
    EngineMoveService(Supplier<AiEngine> factory, int poolSize, Random random) {
        this.factory = factory;
        this.poolSize = poolSize;
        this.random = random;
        this.available = true;
    }

    /** Engine đã cài đặt và có thể chạy. */
    public boolean isAvailable() {
        return available;
    }

    public static String levelName(int level) {
        return LEVELS[clamp(level) - 1].name();
    }

    /**
     * Nước đi của bên {@code side} tại thế {@code board}. {@code history} là các nước UCI từ thế {@code startFen}
     * (để engine nhận biết lặp thế). Luôn trả về một nước hợp lệ; ném {@link EngineBusyException} nếu hết slot.
     */
    public XiangqiRules.Move chooseMove(String startFen, List<String> history, String board, char side, int level)
        throws EngineBusyException {
        List<XiangqiRules.Move> legal = XiangqiRules.legalMoves(board, side);
        if (legal.isEmpty()) {
            throw new IllegalStateException("Không còn nước đi hợp lệ");
        }
        if (legal.size() == 1) {
            return legal.get(0);
        }
        Level cfg = LEVELS[clamp(level) - 1];
        List<XiangqiRules.Move> ranked = new ArrayList<>();
        for (int attempt = 0; attempt < 2 && ranked.isEmpty(); attempt++) {
            AiEngine engine = acquire();
            boolean healthy = false;
            try {
                for (Line line : engine.search(startFen, history, cfg.limit(), cfg.multiPv())) {
                    XiangqiNotation.fromUci(line.move()).filter(legal::contains).ifPresentOrElse(
                        m -> {
                            if (!ranked.contains(m)) {
                                ranked.add(m);
                            }
                        },
                        () -> log.warn("[AI] Engine trả nước không hợp lệ: {}", line.move()));
                }
                healthy = true;
            } catch (EngineException e) {
                log.warn("[AI] Engine lỗi (lần {}): {}", attempt + 1, e.getMessage());
                healthy = engine.isAlive();
            } finally {
                release(engine, healthy);
            }
        }
        if (ranked.isEmpty()) {
            log.warn("[AI] Dùng nước ngẫu nhiên thay cho engine");
            return legal.get(random.nextInt(legal.size()));
        }
        return pick(cfg, ranked);
    }

    private XiangqiRules.Move pick(Level cfg, List<XiangqiRules.Move> ranked) {
        if (cfg.altChance() > 0 && random.nextDouble() < cfg.altChance()) {
            int to = Math.min(cfg.altTo(), ranked.size() - 1);
            int from = Math.min(cfg.altFrom(), to);
            return ranked.get(from + random.nextInt(to - from + 1));
        }
        return ranked.get(0);
    }

    private AiEngine acquire() throws EngineBusyException {
        AiEngine engine = idle.poll();
        if (engine != null) {
            return engine;
        }
        while (true) {
            int n = created.get();
            if (n >= poolSize) {
                break;
            }
            if (created.compareAndSet(n, n + 1)) {
                AiEngine fresh = factory.get();
                synchronized (all) {
                    all.add(fresh);
                }
                return fresh;
            }
        }
        try {
            engine = idle.poll(ACQUIRE_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EngineBusyException();
        }
        if (engine == null) {
            throw new EngineBusyException();
        }
        return engine;
    }

    // Engine chết thì bỏ đi, slot được tạo lại bằng tiến trình mới ở lần sau
    private void release(AiEngine engine, boolean healthy) {
        if (healthy) {
            idle.add(engine);
            return;
        }
        engine.close();
        synchronized (all) {
            all.remove(engine);
        }
        created.decrementAndGet();
    }

    @PreDestroy
    public void shutdown() {
        synchronized (all) {
            all.forEach(AiEngine::close);
            all.clear();
        }
    }

    private static int clamp(int level) {
        return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
    }
}
