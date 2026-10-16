package com.chessxiangqi.xiangqi_backend.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.chessxiangqi.xiangqi_backend.util.XiangqiRules.Move;
import com.chessxiangqi.xiangqi_backend.util.XiangqiRules.Status;

class XiangqiRulesTest {

    private static final String INITIAL_BOARD =
        "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR";

    /** Tạo bàn cờ trống với các quân cho trước, mỗi quân dạng "<ký tự><x><y>", ví dụ "k30". */
    private static String board(String... pieces) {
        char[] cells = ".".repeat(90).toCharArray();
        for (String p : pieces) {
            int x = p.charAt(1) - '0';
            int y = p.charAt(2) - '0';
            cells[y * 9 + x] = p.charAt(0);
        }
        return new String(cells);
    }

    private static boolean hasMove(List<Move> moves, int fx, int fy, int tx, int ty) {
        return moves.contains(new Move(fx, fy, tx, ty));
    }

    @Test
    void initialBoardHasNoCheckAndRedHasMoves() {
        assertEquals(90, INITIAL_BOARD.length());
        assertFalse(XiangqiRules.isInCheck(INITIAL_BOARD, 'r'));
        assertFalse(XiangqiRules.isInCheck(INITIAL_BOARD, 'b'));
        assertEquals(Status.NORMAL, XiangqiRules.evaluate(INITIAL_BOARD, 'r'));
    }

    @Test
    void initialBoardMoveCountAndSamples() {
        List<Move> red = XiangqiRules.legalMoves(INITIAL_BOARD, 'r');
        // Số nước mở đầu chuẩn của đỏ là 44
        assertEquals(44, red.size());
        // Mã (1,0) nhảy sang (2,2) qua chân mã (1,1) trống
        assertTrue(hasMove(red, 1, 0, 2, 2));
        // Mã (1,0) sang (3,1) bị tượng (2,0) chặn chân mã
        assertFalse(hasMove(red, 1, 0, 3, 1));
        // Tốt chưa qua sông không đi ngang
        assertFalse(hasMove(red, 0, 3, 1, 3));
    }

    @Test
    void chariotIsBlockedByOwnPiece() {
        // Xe đỏ ở (0,0), ngay bên phải là mã đỏ (1,0): không đi ngang được
        List<Move> red = XiangqiRules.legalMoves(INITIAL_BOARD, 'r');
        assertFalse(hasMove(red, 0, 0, 1, 0));
        assertTrue(hasMove(red, 0, 0, 0, 2));
    }

    @Test
    void checkMustBeResolved() {
        // Tướng đỏ (4,0) bị xe đen (4,5) chiếu dọc cột 4
        String b = board("k40", "K09", "R45");
        assertTrue(XiangqiRules.isInCheck(b, 'r'));
        List<Move> red = XiangqiRules.legalMoves(b, 'r');
        // Chỉ tướng sang (3,0) hoặc (5,0) là thoát; (4,1) vẫn nằm trên đường xe
        assertEquals(2, red.size());
        assertTrue(hasMove(red, 4, 0, 3, 0));
        assertTrue(hasMove(red, 4, 0, 5, 0));
        assertEquals(Status.CHECK, XiangqiRules.evaluate(b, 'r'));
    }

    @Test
    void kingCannotStepIntoAttackedSquare() {
        // Xe đen (5,1) kiểm soát hàng 1 và cột 5: tướng đỏ (4,0) chỉ còn (3,0) là an toàn
        // (tướng đen để ở (0,9) để không đối mặt với tướng đỏ ở cột 3)
        String b = board("k40", "K09", "R51");
        List<Move> red = XiangqiRules.legalMoves(b, 'r');
        assertEquals(1, red.size());
        assertTrue(hasMove(red, 4, 0, 3, 0));
    }

    @Test
    void flyingGeneralIsIllegal() {
        // Hai tướng đối mặt trên cột 4 không có quân giữa
        String b = board("k40", "K49");
        assertTrue(XiangqiRules.kingsFacing(b));
        // Tướng đỏ (4,0) đi lên (4,1) vẫn đối mặt tướng đen, bị loại
        List<Move> red = XiangqiRules.legalMoves(b, 'r');
        assertFalse(hasMove(red, 4, 0, 4, 1));
        assertTrue(hasMove(red, 4, 0, 3, 0));
        assertTrue(hasMove(red, 4, 0, 5, 0));
    }

    @Test
    void kingsFacingIsFalseWhenPieceBetween() {
        String b = board("k40", "K49", "c45");
        assertFalse(XiangqiRules.kingsFacing(b));
    }

    @Test
    void pinnedChariotCannotLeaveFile() {
        // Xe đỏ (4,3) bị ghim giữa tướng (4,0) và xe đen (4,9) (tướng đen ở (3,9))
        String b = board("k40", "r43", "R49", "K39");
        List<Move> red = XiangqiRules.legalMoves(b, 'r');
        // Đi ngang làm lộ tướng: không hợp lệ
        assertFalse(hasMove(red, 4, 3, 3, 3));
        assertFalse(hasMove(red, 4, 3, 5, 3));
        // Đi dọc giữ được chắn: hợp lệ
        assertTrue(hasMove(red, 4, 3, 4, 5));
    }

    @Test
    void checkmateWithTwoChariots() {
        // Tướng đen (5,9) bị xe (0,9) chiếu hàng 9; ô (4,9) và (5,8) đều bị xe (0,8) kiểm soát
        String b = board("k30", "K59", "r09", "r08");
        assertTrue(XiangqiRules.isInCheck(b, 'b'));
        assertTrue(XiangqiRules.legalMoves(b, 'b').isEmpty());
        assertEquals(Status.CHECKMATE, XiangqiRules.evaluate(b, 'b'));
    }

    @Test
    void stalemateIsNotCheckAndHasNoMoves() {
        // Tướng đen (5,9) không bị chiếu nhưng mọi ô đi đều bị xe (4,8) kiểm soát
        String b = board("k30", "K59", "r48");
        assertFalse(XiangqiRules.isInCheck(b, 'b'));
        assertTrue(XiangqiRules.legalMoves(b, 'b').isEmpty());
        assertEquals(Status.STALEMATE, XiangqiRules.evaluate(b, 'b'));
    }

    @Test
    void elephantCannotCrossRiverAndNeedsEye() {
        // Tượng đỏ (2,0), mắt (1,1) bị chặn bởi quân (1,1)
        String blocked = board("k30", "K59", "e20", "p11");
        List<Move> red = XiangqiRules.legalMoves(blocked, 'r');
        assertFalse(hasMove(red, 2, 0, 0, 2));
        assertTrue(hasMove(red, 2, 0, 4, 2));
        // Tượng đỏ ở (4,4) không được sang (2,6)/(6,6) vì vượt sông
        String river = board("k30", "K59", "e44");
        List<Move> redRiver = XiangqiRules.legalMoves(river, 'r');
        assertTrue(hasMove(redRiver, 4, 4, 2, 2));
        assertFalse(hasMove(redRiver, 4, 4, 2, 6));
        assertFalse(hasMove(redRiver, 4, 4, 6, 6));
    }

    @Test
    void cannonCapturesOnlyOverOneScreen() {
        // Không có quân chắn: pháo (4,0) không ăn được tốt đen (4,5)
        List<Move> none = XiangqiRules.legalMoves(board("k30", "K59", "c40", "P45"), 'r');
        assertFalse(hasMove(none, 4, 0, 4, 5));
        // Đúng một quân chắn (4,1): ăn được tốt
        List<Move> oneScreen = XiangqiRules.legalMoves(board("k30", "K59", "c40", "a41", "P45"), 'r');
        assertTrue(hasMove(oneScreen, 4, 0, 4, 5));
        // Hai quân chắn (4,1) và (4,3): không ăn được
        List<Move> twoScreens = XiangqiRules.legalMoves(
            board("k30", "K59", "c40", "a41", "a43", "P45"), 'r');
        assertFalse(hasMove(twoScreens, 4, 0, 4, 5));
    }

    @Test
    void sideMovesOnlyAfterRiver() {
        // Tốt đỏ chưa qua sông (y=4) không đi ngang; qua sông (y=5) thì đi ngang được
        String before = board("k30", "K59", "p44");
        assertFalse(hasMove(XiangqiRules.legalMoves(before, 'r'), 4, 4, 3, 4));
        String after = board("k30", "K59", "p45");
        assertTrue(hasMove(XiangqiRules.legalMoves(after, 'r'), 4, 5, 3, 5));
    }

    @Test
    void horseLegBlockedByPiece() {
        // Mã đỏ (4,4): chân mã (4,3) bị chặn -> không nhảy được (2,3)... nhảy dọc (3,6) qua chân (4,5) hoặc (3,5)
        String b = board("k30", "K59", "h44", "a43");
        List<Move> red = XiangqiRules.legalMoves(b, 'r');
        // Mã nhảy (2,5) và (6,5) có chân mã (3,4)/(5,4) trống -> hợp lệ
        assertTrue(hasMove(red, 4, 4, 2, 5));
        // Mã nhảy (2,3) có chân mã (3,4) trống -> hợp lệ (không bị chặn bởi sĩ (4,3))
        assertTrue(hasMove(red, 4, 4, 2, 3));
        // Mã nhảy (3,2) và (5,2) qua chân (4,3) (đang có sĩ) -> bị chặn
        assertFalse(hasMove(red, 4, 4, 3, 2));
        assertFalse(hasMove(red, 4, 4, 5, 2));
    }
}
