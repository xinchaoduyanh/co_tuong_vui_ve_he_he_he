package com.chessxiangqi.xiangqi_backend.model;

import lombok.Data;

/** Trạng thái một trận đang diễn ra, giữ trên server (nguồn sự thật cho luật, lượt và kết thúc). */
@Data
public class GameSession {
    // Đỏ luôn là player1 của trận, đen là player2
    private final String matchId;
    private final String redPlayerId;
    private final String redUsername;
    private final String blackPlayerId;
    private final String blackUsername;

    private String boardState;
    private char turn;            // 'r' | 'b': bên đang đến lượt
    private int nextTurnNumber;   // số thứ tự nước đi tiếp theo
    private boolean check;        // bên đang đến lượt có bị chiếu không
    private boolean ended;
    private String endReason;
    private Character winnerColor; // 'r' | 'b' | null (hòa)

    // Đồng hồ: thời gian còn lại tại mốc lastTickAt của bên đang đến lượt
    private long redTimeMs;
    private long blackTimeMs;
    private long lastTickAt;
}
