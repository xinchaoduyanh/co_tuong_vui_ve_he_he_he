package com.chessxiangqi.xiangqi_backend.util;

import java.util.Optional;

/**
 * Chuyển đổi giữa bàn cờ của repo (xem {@link XiangqiRules}) và ký hiệu UCI/FEN của Pikafish.
 *
 * <p>Repo: ô (x, y) ở chỉ số {@code y * 9 + x}, chữ thường = đỏ (y nhỏ), chữ HOA = đen, tượng là 'e', mã là 'h'.
 * <p>Pikafish: FEN liệt kê hạng 9 trước; chữ HOA = đỏ, chữ thường = đen; tượng 'b', mã 'n'; 'w' = đỏ đi.
 * Nước đi viết {@code <cột a-i><hạng 0-9>} ghép hai ô, ví dụ {@code h2e2}.
 * Đỏ ở hạng 0 trùng với y = 0 của repo nên cột = x và hạng = y, không cần đảo gương.
 */
public final class XiangqiNotation {

    public static final String INITIAL_BOARD =
        "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR";

    public static final String INITIAL_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1";

    private XiangqiNotation() {
    }

    /** FEN của thế cờ {@code board} khi đến lượt {@code sideToMove} ('r' | 'b'). */
    public static String toFen(String board, char sideToMove) {
        StringBuilder fen = new StringBuilder();
        for (int y = XiangqiRules.HEIGHT - 1; y >= 0; y--) {
            int empty = 0;
            for (int x = 0; x < XiangqiRules.WIDTH; x++) {
                char c = board.charAt(y * XiangqiRules.WIDTH + x);
                if (c == '.') {
                    empty++;
                    continue;
                }
                if (empty > 0) {
                    fen.append(empty);
                    empty = 0;
                }
                fen.append(pieceToFen(c));
            }
            if (empty > 0) {
                fen.append(empty);
            }
            if (y > 0) {
                fen.append('/');
            }
        }
        return fen.append(' ').append(sideToMove == XiangqiRules.RED ? 'w' : 'b').append(" - - 0 1").toString();
    }

    /** Bàn cờ 90 ký tự từ phần bố trí quân của FEN (các trường sau bị bỏ qua). */
    public static Optional<String> boardFromFen(String fen) {
        String[] ranks = fen.trim().split("\\s+")[0].split("/");
        if (ranks.length != XiangqiRules.HEIGHT) {
            return Optional.empty();
        }
        char[] board = new char[XiangqiRules.WIDTH * XiangqiRules.HEIGHT];
        for (int i = 0; i < ranks.length; i++) {
            int y = XiangqiRules.HEIGHT - 1 - i;
            int x = 0;
            for (char c : ranks[i].toCharArray()) {
                if (Character.isDigit(c)) {
                    for (int n = c - '0'; n > 0 && x < XiangqiRules.WIDTH; n--) {
                        board[y * XiangqiRules.WIDTH + x++] = '.';
                    }
                } else if (x < XiangqiRules.WIDTH && "KABNRCPkabnrcp".indexOf(c) >= 0) {
                    board[y * XiangqiRules.WIDTH + x++] = pieceFromFen(c);
                } else {
                    return Optional.empty();
                }
            }
            if (x != XiangqiRules.WIDTH) {
                return Optional.empty();
            }
        }
        return Optional.of(new String(board));
    }

    /** Nước đi dạng UCI, ví dụ {@code (7,2)->(4,2)} thành {@code "h2e2"}. */
    public static String toUci(XiangqiRules.Move move) {
        return "" + (char) ('a' + move.fromX()) + move.fromY() + (char) ('a' + move.toX()) + move.toY();
    }

    /** Đọc nước UCI; trả về empty nếu sai định dạng hoặc ngoài bàn cờ. */
    public static Optional<XiangqiRules.Move> fromUci(String uci) {
        if (uci == null || uci.length() != 4) {
            return Optional.empty();
        }
        int fromX = uci.charAt(0) - 'a';
        int fromY = uci.charAt(1) - '0';
        int toX = uci.charAt(2) - 'a';
        int toY = uci.charAt(3) - '0';
        if (!onBoard(fromX, fromY) || !onBoard(toX, toY)) {
            return Optional.empty();
        }
        return Optional.of(new XiangqiRules.Move(fromX, fromY, toX, toY));
    }

    private static boolean onBoard(int x, int y) {
        return x >= 0 && x < XiangqiRules.WIDTH && y >= 0 && y < XiangqiRules.HEIGHT;
    }

    // repo: thường = đỏ -> FEN: HOA; repo: HOA = đen -> FEN: thường. 'e' <-> 'b', 'h' <-> 'n'.
    private static char pieceToFen(char c) {
        char kind = Character.toLowerCase(c);
        char fenKind = kind == 'e' ? 'b' : kind == 'h' ? 'n' : kind;
        return Character.isLowerCase(c) ? Character.toUpperCase(fenKind) : fenKind;
    }

    private static char pieceFromFen(char c) {
        char kind = Character.toLowerCase(c);
        char repoKind = kind == 'b' ? 'e' : kind == 'n' ? 'h' : kind;
        return Character.isUpperCase(c) ? repoKind : Character.toUpperCase(repoKind);
    }
}
