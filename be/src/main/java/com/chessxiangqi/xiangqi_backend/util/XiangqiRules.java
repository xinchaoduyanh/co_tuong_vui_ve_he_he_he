package com.chessxiangqi.xiangqi_backend.util;

import java.util.ArrayList;
import java.util.List;

/**
 * Luật cờ tướng phía server.
 * Bàn cờ: 90 ký tự, ô (x, y) nằm ở chỉ số y * 9 + x (x: 0-8, y: 0-9).
 * Chữ thường = quân đỏ ('r', phía trên y nhỏ), chữ hoa = quân đen ('b', phía dưới y lớn).
 * Ký tự quân: k/K tướng, a/A sĩ, e/E tượng, h/H mã, r/R xe, c/C pháo, p/P tốt.
 */
public final class XiangqiRules {

    public static final int WIDTH = 9;
    public static final int HEIGHT = 10;
    public static final char RED = 'r';
    public static final char BLACK = 'b';

    private static final char EMPTY = '.';

    public enum Status {
        NORMAL,
        CHECK,
        CHECKMATE,
        STALEMATE
    }

    public record Move(int fromX, int fromY, int toX, int toY) {
    }

    private static final int[][] DIAGONALS = {{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
    private static final int[][] ORTHOGONALS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    private static final int[][] HORSE_JUMPS = {
        {2, 1}, {2, -1}, {-2, 1}, {-2, -1}, {1, 2}, {1, -2}, {-1, 2}, {-1, -2}
    };

    private XiangqiRules() {
    }

    /** Các nước đi hợp lệ của bên {@code side}: không để tướng mình bị chiếu, không đối mặt tướng. */
    public static List<Move> legalMoves(String board, char side) {
        List<Move> result = new ArrayList<>();
        for (Move move : pseudoLegalMoves(board, side)) {
            String next = apply(board, move);
            if (!isInCheck(next, side) && !kingsFacing(next)) {
                result.add(move);
            }
        }
        return result;
    }

    /** Tướng của {@code side} có đang bị quân địch chiếu không. */
    public static boolean isInCheck(String board, char side) {
        int[] king = findKing(board, side);
        if (king == null) {
            return false;
        }
        for (Move move : pseudoLegalMoves(board, opponent(side))) {
            if (move.toX() == king[0] && move.toY() == king[1]) {
                return true;
            }
        }
        return false;
    }

    /** Hai tướng nằm cùng cột và không có quân nào ở giữa (luật "tướng đối mặt"). */
    public static boolean kingsFacing(String board) {
        int[] red = findKing(board, RED);
        int[] black = findKing(board, BLACK);
        if (red == null || black == null || red[0] != black[0]) {
            return false;
        }
        int minY = Math.min(red[1], black[1]);
        int maxY = Math.max(red[1], black[1]);
        for (int y = minY + 1; y < maxY; y++) {
            if (charAt(board, red[0], y) != EMPTY) {
                return false;
            }
        }
        return true;
    }

    /**
     * Trạng thái của bên đang đến lượt {@code sideToMove}.
     * Hết nước đi: nếu đang bị chiếu là CHECKMATE (thua), nếu không là STALEMATE (cũng thua theo luật cờ tướng).
     */
    public static Status evaluate(String board, char sideToMove) {
        boolean inCheck = isInCheck(board, sideToMove);
        if (!legalMoves(board, sideToMove).isEmpty()) {
            return inCheck ? Status.CHECK : Status.NORMAL;
        }
        return inCheck ? Status.CHECKMATE : Status.STALEMATE;
    }

    /** Áp dụng nước đi (không kiểm tra hợp lệ) và trả về bàn cờ mới. */
    public static String apply(String board, Move move) {
        char[] cells = board.toCharArray();
        int from = index(move.fromX(), move.fromY());
        int to = index(move.toX(), move.toY());
        cells[to] = cells[from];
        cells[from] = EMPTY;
        return new String(cells);
    }

    public static char opponent(char side) {
        return side == RED ? BLACK : RED;
    }

    /** Nước đi theo luật từng quân, chưa lọc việc tự chiếu / đối mặt tướng. */
    public static List<Move> pseudoLegalMoves(String board, char side) {
        List<Move> moves = new ArrayList<>();
        for (int y = 0; y < HEIGHT; y++) {
            for (int x = 0; x < WIDTH; x++) {
                char piece = charAt(board, x, y);
                if (piece == EMPTY || owner(piece) != side) {
                    continue;
                }
                switch (Character.toLowerCase(piece)) {
                    case 'k' -> addKing(moves, board, side, x, y);
                    case 'a' -> addAdvisor(moves, board, side, x, y);
                    case 'e' -> addElephant(moves, board, side, x, y);
                    case 'h' -> addHorse(moves, board, side, x, y);
                    case 'r' -> {
                        for (int[] d : ORTHOGONALS) {
                            addSlide(moves, board, side, x, y, d[0], d[1], false);
                        }
                    }
                    case 'c' -> {
                        for (int[] d : ORTHOGONALS) {
                            addSlide(moves, board, side, x, y, d[0], d[1], true);
                        }
                    }
                    case 'p' -> addPawn(moves, board, side, x, y);
                    default -> {
                    }
                }
            }
        }
        return moves;
    }

    private static void addKing(List<Move> moves, String board, char side, int x, int y) {
        for (int[] d : ORTHOGONALS) {
            addIfTarget(moves, board, side, x, y, x + d[0], y + d[1], true);
        }
    }

    private static void addAdvisor(List<Move> moves, String board, char side, int x, int y) {
        for (int[] d : DIAGONALS) {
            addIfTarget(moves, board, side, x, y, x + d[0], y + d[1], true);
        }
    }

    private static void addElephant(List<Move> moves, String board, char side, int x, int y) {
        for (int[] d : DIAGONALS) {
            int nx = x + 2 * d[0];
            int ny = y + 2 * d[1];
            // Tượng không qua sông: đỏ ở y <= 4, đen ở y >= 5
            boolean ownHalf = side == RED ? ny <= 4 : ny >= 5;
            if (!inBoard(nx, ny) || !ownHalf) {
                continue;
            }
            // Mắt tượng không bị chặn
            if (charAt(board, x + d[0], y + d[1]) != EMPTY) {
                continue;
            }
            addIfTarget(moves, board, side, x, y, nx, ny, false);
        }
    }

    private static void addHorse(List<Move> moves, String board, char side, int x, int y) {
        for (int[] d : HORSE_JUMPS) {
            if (!inBoard(x + d[0], y + d[1])) {
                continue;
            }
            // Chân mã nằm ở ô kề theo hướng bước dài
            int legX = Math.abs(d[0]) == 2 ? x + d[0] / 2 : x;
            int legY = Math.abs(d[1]) == 2 ? y + d[1] / 2 : y;
            if (charAt(board, legX, legY) != EMPTY) {
                continue;
            }
            addIfTarget(moves, board, side, x, y, x + d[0], y + d[1], false);
        }
    }

    private static void addPawn(List<Move> moves, String board, char side, int x, int y) {
        int forward = side == RED ? 1 : -1;
        addIfTarget(moves, board, side, x, y, x, y + forward, false);
        // Sau khi qua sông mới được đi ngang
        boolean crossedRiver = side == RED ? y >= 5 : y <= 4;
        if (crossedRiver) {
            addIfTarget(moves, board, side, x, y, x - 1, y, false);
            addIfTarget(moves, board, side, x, y, x + 1, y, false);
        }
    }

    /** Xe (cannon=false) đi trượt đến khi gặp quân; Pháo (cannon=true) phải nhảy qua đúng một quân để ăn. */
    private static void addSlide(List<Move> moves, String board, char side, int x, int y,
                                 int dx, int dy, boolean cannon) {
        boolean screened = false;
        for (int nx = x + dx, ny = y + dy; inBoard(nx, ny); nx += dx, ny += dy) {
            char target = charAt(board, nx, ny);
            if (!cannon) {
                if (target == EMPTY) {
                    moves.add(new Move(x, y, nx, ny));
                    continue;
                }
                if (owner(target) != side) {
                    moves.add(new Move(x, y, nx, ny));
                }
                return;
            }
            if (!screened) {
                if (target == EMPTY) {
                    moves.add(new Move(x, y, nx, ny));
                } else {
                    screened = true;
                }
            } else if (target != EMPTY) {
                if (owner(target) != side) {
                    moves.add(new Move(x, y, nx, ny));
                }
                return;
            }
        }
    }

    /** Thêm nước đi nếu ô đích nằm trong bàn, (với cung=true) trong cung, và không có quân cùng màu. */
    private static void addIfTarget(List<Move> moves, String board, char side, int fromX, int fromY,
                                    int toX, int toY, boolean mustStayInPalace) {
        if (!inBoard(toX, toY)) {
            return;
        }
        if (mustStayInPalace && !inPalace(side, toX, toY)) {
            return;
        }
        char target = charAt(board, toX, toY);
        if (target == EMPTY || owner(target) != side) {
            moves.add(new Move(fromX, fromY, toX, toY));
        }
    }

    private static boolean inPalace(char side, int x, int y) {
        boolean columnOk = x >= 3 && x <= 5;
        boolean rowOk = side == RED ? y <= 2 : y >= 7;
        return columnOk && rowOk;
    }

    private static int[] findKing(String board, char side) {
        char kingChar = side == RED ? 'k' : 'K';
        int idx = board.indexOf(kingChar);
        if (idx < 0) {
            return null;
        }
        return new int[] {idx % WIDTH, idx / WIDTH};
    }

    /** Bên sở hữu quân: 'r' cho chữ thường, 'b' cho chữ hoa. */
    public static char owner(char piece) {
        return Character.isUpperCase(piece) ? BLACK : RED;
    }

    private static boolean inBoard(int x, int y) {
        return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
    }

    private static int index(int x, int y) {
        return y * WIDTH + x;
    }

    private static char charAt(String board, int x, int y) {
        return board.charAt(index(x, y));
    }
}
