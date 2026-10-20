package com.chessxiangqi.xiangqi_backend.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.chessxiangqi.xiangqi_backend.util.XiangqiRules.Move;

class XiangqiNotationTest {

    @Test
    void initialBoardMatchesStandardFen() {
        assertEquals(XiangqiNotation.INITIAL_FEN, XiangqiNotation.toFen(XiangqiNotation.INITIAL_BOARD, 'r'));
    }

    @Test
    void sideToMoveIsEncoded() {
        assertTrue(XiangqiNotation.toFen(XiangqiNotation.INITIAL_BOARD, 'b').contains(" b "));
    }

    @Test
    void fenRoundTripsToBoard() {
        assertEquals(Optional.of(XiangqiNotation.INITIAL_BOARD), XiangqiNotation.boardFromFen(XiangqiNotation.INITIAL_FEN));
    }

    @Test
    void positionAfterMovesRoundTrips() {
        // Pháo đỏ h2e2 rồi mã đen h9g7 (UCI) trên bàn của repo
        String board = XiangqiRules.apply(XiangqiNotation.INITIAL_BOARD, XiangqiNotation.fromUci("h2e2").orElseThrow());
        board = XiangqiRules.apply(board, XiangqiNotation.fromUci("h9g7").orElseThrow());
        assertEquals("rnbakab1r/9/1c4nc1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C4/9/RNBAKABNR w - - 0 1",
            XiangqiNotation.toFen(board, 'r'));
        assertEquals(Optional.of(board), XiangqiNotation.boardFromFen(XiangqiNotation.toFen(board, 'r')));
    }

    @Test
    void uciCoordinatesUseFileAndRank() {
        // Pháo đỏ ở (7,2) -> (4,2) là h2e2; xe đen (0,9) -> (0,8) là a9a8
        assertEquals("h2e2", XiangqiNotation.toUci(new Move(7, 2, 4, 2)));
        assertEquals("a9a8", XiangqiNotation.toUci(new Move(0, 9, 0, 8)));
        assertEquals(Optional.of(new Move(7, 2, 4, 2)), XiangqiNotation.fromUci("h2e2"));
        assertEquals(Optional.of(new Move(8, 9, 0, 0)), XiangqiNotation.fromUci("i9a0"));
    }

    @Test
    void rejectsMalformedInput() {
        assertEquals(Optional.empty(), XiangqiNotation.fromUci("h2"));
        assertEquals(Optional.empty(), XiangqiNotation.fromUci("j2e2"));
        assertEquals(Optional.empty(), XiangqiNotation.fromUci("a10a9"));
        assertEquals(Optional.empty(), XiangqiNotation.fromUci(null));
        assertEquals(Optional.empty(), XiangqiNotation.boardFromFen("9/9/9"));
        assertEquals(Optional.empty(), XiangqiNotation.boardFromFen("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNX w"));
    }

    @Test
    void everyInitialMoveOfRedTranslatesToLegalUci() {
        // Mọi nước hợp lệ ban đầu của đỏ phải đọc ngược lại đúng
        for (Move m : XiangqiRules.legalMoves(XiangqiNotation.INITIAL_BOARD, 'r')) {
            assertEquals(Optional.of(m), XiangqiNotation.fromUci(XiangqiNotation.toUci(m)));
        }
    }
}
