package com.chessxiangqi.xiangqi_backend.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.Line;
import com.chessxiangqi.xiangqi_backend.service.ai.AiEngine.SearchLimit;
import com.chessxiangqi.xiangqi_backend.util.XiangqiNotation;
import com.chessxiangqi.xiangqi_backend.util.XiangqiRules;

class UciEngineClientTest {

    @Test
    void parsesMultiPvInfoLines() {
        Map<Integer, Line> byRank = new LinkedHashMap<>();
        UciEngineClient.parseInfo("info depth 1 seldepth 3 multipv 2 score cp 15 nodes 144 pv b0c2 b9c7", byRank);
        UciEngineClient.parseInfo("info depth 2 seldepth 3 multipv 2 score cp -7 nodes 144 pv h0g2", byRank);
        UciEngineClient.parseInfo("info depth 2 multipv 1 score mate 3 pv h2e2", byRank);
        UciEngineClient.parseInfo("info string NNUE evaluation using pikafish.nnue", byRank);
        assertEquals(new Line(2, -7, "h0g2"), byRank.get(2));
        assertEquals(29_997, byRank.get(1).scoreCp());
        assertEquals(2, byRank.size());
    }

    /** Chạy engine thật nếu đã cài ở ~/engines/pikafish (bỏ qua nếu không có). */
    @Test
    void realEngineReturnsLegalMoves() throws Exception {
        Path home = Path.of(System.getProperty("user.home"), "engines", "pikafish");
        Path binary = home.resolve("Pikafish-Linux-x86-64-universal");
        Path nnue = home.resolve("pikafish.nnue");
        assumeTrue(Files.isExecutable(binary) && Files.isRegularFile(nnue), "chưa cài Pikafish");

        try (UciEngineClient engine = new UciEngineClient(binary, nnue, 1, 16)) {
            List<Line> lines = engine.search(XiangqiNotation.INITIAL_FEN, List.of(), new SearchLimit(1, null), 4);
            assertEquals(4, lines.size());
            List<XiangqiRules.Move> legal = XiangqiRules.legalMoves(XiangqiNotation.INITIAL_BOARD, 'r');
            for (Line l : lines) {
                assertTrue(legal.contains(XiangqiNotation.fromUci(l.move()).orElseThrow()), l.move());
            }

            // Sau h2e2, đen đi: nước trả về phải hợp lệ cho đen
            String board = XiangqiRules.apply(XiangqiNotation.INITIAL_BOARD, XiangqiNotation.fromUci("h2e2").orElseThrow());
            List<Line> reply = engine.search(XiangqiNotation.INITIAL_FEN, List.of("h2e2"), new SearchLimit(null, 200), 1);
            assertTrue(XiangqiRules.legalMoves(board, 'b').contains(XiangqiNotation.fromUci(reply.get(0).move()).orElseThrow()));
        }
    }
}
