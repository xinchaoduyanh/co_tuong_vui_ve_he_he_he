package com.chessxiangqi.xiangqi_backend.service.ai;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import lombok.extern.slf4j.Slf4j;

/**
 * Điều khiển một tiến trình engine UCI (Pikafish). Tiến trình được khởi động ở lần tìm kiếm đầu tiên và
 * khởi động lại nếu đã chết; một luồng đọc riêng đẩy từng dòng stdout vào hàng đợi.
 */
@Slf4j
public class UciEngineClient implements AiEngine {

    private static final String EOF = "\u0000EOF";
    private static final long STARTUP_TIMEOUT_MS = 15_000;
    private static final long SEARCH_GRACE_MS = 10_000;
    private static final long DEPTH_SEARCH_TIMEOUT_MS = 30_000;

    private final Path binary;
    private final Path nnue;
    private final int threads;
    private final int hashMb;

    private Process process;
    private BufferedWriter stdin;
    private BlockingQueue<String> lines;

    public UciEngineClient(Path binary, Path nnue, int threads, int hashMb) {
        this.binary = binary;
        this.nnue = nnue;
        this.threads = threads;
        this.hashMb = hashMb;
    }

    @Override
    public synchronized List<Line> search(String fen, List<String> uciMoves, SearchLimit limit, int multiPv)
        throws EngineException {
        ensureStarted();
        try {
            send("setoption name MultiPV value " + Math.max(1, multiPv));
            send("isready");
            awaitLine("readyok", STARTUP_TIMEOUT_MS);
            lines.clear();

            String position = "position fen " + fen;
            if (!uciMoves.isEmpty()) {
                position += " moves " + String.join(" ", uciMoves);
            }
            send(position);
            long timeoutMs;
            if (limit.movetimeMs() != null) {
                send("go movetime " + limit.movetimeMs());
                timeoutMs = limit.movetimeMs() + SEARCH_GRACE_MS;
            } else {
                send("go depth " + limit.depth());
                timeoutMs = DEPTH_SEARCH_TIMEOUT_MS;
            }
            return readResult(timeoutMs);
        } catch (IOException e) {
            destroy();
            throw new EngineException("Mất kết nối với engine", e);
        } catch (EngineException e) {
            destroy();
            throw e;
        }
    }

    private List<Line> readResult(long timeoutMs) throws EngineException {
        Map<Integer, Line> byRank = new TreeMap<>();
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
        while (true) {
            String line = poll(deadline);
            if (line.startsWith("bestmove")) {
                String[] parts = line.split("\\s+");
                if (parts.length < 2 || "(none)".equals(parts[1])) {
                    throw new EngineException("Engine không có nước đi");
                }
                if (byRank.isEmpty()) {
                    byRank.put(1, new Line(1, 0, parts[1]));
                }
                return new ArrayList<>(byRank.values());
            }
            if (line.startsWith("info ")) {
                parseInfo(line, byRank);
            }
        }
    }

    /** {@code info depth 12 ... multipv 2 score cp 31 ... pv h2e2 h9g7 ...} -> Line (dòng sau ghi đè dòng trước). */
    static void parseInfo(String info, Map<Integer, Line> byRank) {
        String[] t = info.split("\\s+");
        int multiPv = 1;
        Integer score = null;
        String move = null;
        for (int i = 0; i < t.length - 1; i++) {
            switch (t[i]) {
                case "multipv" -> multiPv = parseIntOr(t[i + 1], 1);
                case "score" -> {
                    if (i + 2 < t.length) {
                        int v = parseIntOr(t[i + 2], 0);
                        score = "mate".equals(t[i + 1]) ? (v > 0 ? 30_000 - v : -30_000 - v) : v;
                    }
                }
                case "pv" -> {
                    move = t[i + 1];
                    i = t.length;
                }
                default -> {
                }
            }
        }
        if (move != null) {
            byRank.put(multiPv, new Line(multiPv, score == null ? 0 : score, move));
        }
    }

    private static int parseIntOr(String s, int fallback) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private void ensureStarted() throws EngineException {
        if (isAlive()) {
            return;
        }
        destroy();
        try {
            ProcessBuilder builder = new ProcessBuilder(binary.toString())
                .directory(binary.toAbsolutePath().getParent().toFile())
                .redirectErrorStream(true);
            process = builder.start();
        } catch (IOException e) {
            throw new EngineException("Không chạy được engine: " + binary, e);
        }
        stdin = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
        lines = new LinkedBlockingQueue<>();
        BlockingQueue<String> queue = lines;
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
        Thread readerThread = new Thread(() -> {
            try {
                String line;
                while ((line = reader.readLine()) != null) {
                    queue.add(line);
                }
            } catch (IOException ignored) {
                // tiến trình đã đóng
            } finally {
                queue.add(EOF);
            }
        }, "uci-reader");
        readerThread.setDaemon(true);
        readerThread.start();

        try {
            send("uci");
            awaitLine("uciok", STARTUP_TIMEOUT_MS);
            send("setoption name Threads value " + threads);
            send("setoption name Hash value " + hashMb);
            send("setoption name EvalFile value " + nnue.toAbsolutePath());
            send("isready");
            awaitLine("readyok", STARTUP_TIMEOUT_MS);
            log.info("[AI] Engine đã khởi động: {}", binary);
        } catch (IOException | EngineException e) {
            destroy();
            throw e instanceof EngineException ee ? ee : new EngineException("Khởi động engine thất bại", e);
        }
    }

    private void awaitLine(String expected, long timeoutMs) throws EngineException {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
        while (true) {
            String line = poll(deadline);
            if (line.equals(expected)) {
                return;
            }
        }
    }

    private String poll(long deadlineNanos) throws EngineException {
        try {
            long left = deadlineNanos - System.nanoTime();
            String line = left <= 0 ? null : lines.poll(left, TimeUnit.NANOSECONDS);
            if (line == null) {
                throw new EngineException("Engine không phản hồi kịp");
            }
            if (EOF.equals(line)) {
                throw new EngineException("Engine đã thoát");
            }
            return line;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EngineException("Bị ngắt khi chờ engine", e);
        }
    }

    private void send(String command) throws IOException {
        stdin.write(command);
        stdin.newLine();
        stdin.flush();
    }

    @Override
    public synchronized boolean isAlive() {
        return process != null && process.isAlive();
    }

    @Override
    public synchronized void close() {
        if (isAlive()) {
            try {
                send("quit");
            } catch (IOException ignored) {
                // sẽ bị destroy bên dưới
            }
        }
        destroy();
    }

    private void destroy() {
        if (process != null) {
            process.destroyForcibly();
            process = null;
        }
    }
}
