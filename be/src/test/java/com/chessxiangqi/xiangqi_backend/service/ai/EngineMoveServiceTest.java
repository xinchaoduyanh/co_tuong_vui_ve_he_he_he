package com.chessxiangqi.xiangqi_backend.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.junit.jupiter.api.Test;

import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.EngineException;
import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.Line;
import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.SearchLimit;
import com.chessxiangqi.xiangqi_backend.util.XiangqiNotation;
import com.chessxiangqi.xiangqi_backend.util.XiangqiRules;

class EngineMoveServiceTest {

    /** Engine giả trả về danh sách nước định sẵn (hoặc ném lỗi) và ghi lại tham số nhận được. */
    static class FakeEngine implements AiEngine {
        final List<String> moves;
        final boolean fail;
        SearchLimit lastLimit;
        int lastMultiPv;
        List<String> lastHistory;
        int calls;
        boolean closed;

        FakeEngine(boolean fail, String... moves) {
            this.fail = fail;
            this.moves = List.of(moves);
        }

        @Override
        public List<Line> search(String fen, List<String> uciMoves, SearchLimit limit, int multiPv) throws EngineException {
            calls++;
            lastLimit = limit;
            lastMultiPv = multiPv;
            lastHistory = uciMoves;
            if (fail) {
                throw new EngineException("giả lập lỗi");
            }
            List<Line> lines = new ArrayList<>();
            for (int i = 0; i < moves.size(); i++) {
                lines.add(new Line(i + 1, 100 - i, moves.get(i)));
            }
            return lines;
        }

        @Override
        public boolean isAlive() {
            return !fail;
        }

        @Override
        public void close() {
            closed = true;
        }
    }

    private static EngineMoveService service(FakeEngine engine, long seed) {
        return new EngineMoveService(() -> engine, 1, new Random(seed));
    }

    private static final String BOARD = XiangqiNotation.INITIAL_BOARD;

    @Test
    void strongestLevelPlaysEngineBestMove() throws Exception {
        FakeEngine engine = new FakeEngine(false, "h2e2", "b0c2");
        EngineMoveService svc = service(engine, 1);
        XiangqiRules.Move move = svc.chooseMove(XiangqiNotation.INITIAL_FEN, List.of(), BOARD, 'r', 5);
        assertEquals("h2e2", XiangqiNotation.toUci(move));
        assertEquals(2000, engine.lastLimit.movetimeMs());
        assertEquals(1, engine.lastMultiPv);
    }

    @Test
    void historyIsPassedToEngine() throws Exception {
        FakeEngine engine = new FakeEngine(false, "h9g7");
        EngineMoveService svc = service(engine, 1);
        String after = XiangqiRules.apply(BOARD, XiangqiNotation.fromUci("h2e2").orElseThrow());
        svc.chooseMove(XiangqiNotation.INITIAL_FEN, List.of("h2e2"), after, 'b', 3);
        assertEquals(List.of("h2e2"), engine.lastHistory);
        assertEquals(6, engine.lastLimit.depth());
    }

    @Test
    void illegalEngineMoveIsSkipped() throws Exception {
        // a0a9 (xe đỏ xuyên quân) không hợp lệ -> bỏ, dùng nước hợp lệ kế tiếp
        FakeEngine engine = new FakeEngine(false, "a0a9", "b0c2");
        XiangqiRules.Move move = service(engine, 1).chooseMove(XiangqiNotation.INITIAL_FEN, List.of(), BOARD, 'r', 5);
        assertEquals("b0c2", XiangqiNotation.toUci(move));
    }

    @Test
    void fallsBackToRandomLegalMoveWhenEngineFails() throws Exception {
        FakeEngine engine = new FakeEngine(true);
        XiangqiRules.Move move = service(engine, 7).chooseMove(XiangqiNotation.INITIAL_FEN, List.of(), BOARD, 'r', 5);
        assertTrue(XiangqiRules.legalMoves(BOARD, 'r').contains(move));
        assertEquals(2, engine.calls, "thử lại một lần trước khi dùng nước ngẫu nhiên");
        assertTrue(engine.closed, "engine hỏng phải được đóng");
    }

    @Test
    void fallsBackWhenEveryEngineMoveIsIllegal() throws Exception {
        FakeEngine engine = new FakeEngine(false, "zzzz", "a0a9");
        XiangqiRules.Move move = service(engine, 3).chooseMove(XiangqiNotation.INITIAL_FEN, List.of(), BOARD, 'r', 4);
        assertTrue(XiangqiRules.legalMoves(BOARD, 'r').contains(move));
    }

    @Test
    void weakestLevelSometimesPlaysNonBestMove() throws Exception {
        FakeEngine engine = new FakeEngine(false, "h2e2", "b0c2", "h0g2", "b2e2");
        int nonBest = 0;
        EngineMoveService svc = service(engine, 42);
        for (int i = 0; i < 200; i++) {
            XiangqiRules.Move m = svc.chooseMove(XiangqiNotation.INITIAL_FEN, List.of(), BOARD, 'r', 1);
            if (!"h2e2".equals(XiangqiNotation.toUci(m))) {
                nonBest++;
            }
        }
        // altChance 40% và 3/4 trong số đó rơi vào nước khác => khoảng 30%
        assertTrue(nonBest > 30 && nonBest < 100, "nonBest=" + nonBest);
        assertEquals(1, engine.lastLimit.depth());
        assertEquals(4, engine.lastMultiPv);
    }

    @Test
    void singleLegalMoveSkipsEngine() throws Exception {
        // Tướng đỏ bị xe đen chiếu và chỉ có một đường thoát: (3,0) tướng bị khóa góc
        char[] cells = ".".repeat(90).toCharArray();
        cells[0 * 9 + 3] = 'k';   // tướng đỏ (3,0)
        cells[9 * 9 + 5] = 'K';   // tướng đen (5,9)
        cells[0 * 9 + 8] = 'R';   // xe đen ở (8,0) chiếu hàng 0
        cells[1 * 9 + 0] = 'R';   // xe đen (0,1) khóa hàng 1
        cells[0 * 9 + 5] = 'p';   // tốt đỏ chắn
        String board = new String(cells);
        List<XiangqiRules.Move> legal = XiangqiRules.legalMoves(board, 'r');
        FakeEngine engine = new FakeEngine(false, "a0a1");
        if (legal.size() == 1) {
            assertEquals(legal.get(0), service(engine, 1).chooseMove(XiangqiNotation.INITIAL_FEN, List.of(), board, 'r', 5));
            assertEquals(0, engine.calls);
        }
    }
}
