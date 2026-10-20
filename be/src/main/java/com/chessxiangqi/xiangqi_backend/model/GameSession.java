package com.chessxiangqi.xiangqi_backend.model;

import java.util.ArrayList;
import java.util.List;

import com.chessxiangqi.xiangqi_backend.dto.PlayerPublicDto;

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

    // Thời điểm mất kết nối của từng bên (null nếu đang kết nối)
    private Long redDisconnectedAt;
    private Long blackDisconnectedAt;
    private String lastMoveDescription;

    // Thông tin hai người chơi giữ sẵn để snapshot không phải hỏi DB; làm mới khi trận kết thúc
    private PlayerPublicDto redInfo;
    private PlayerPublicDto blackInfo;

    // Trận với máy: aiLevel 1-5 (0 = trận người-người), aiSide là bên máy cầm
    private int aiLevel;
    private char aiSide;
    private int undosUsed;
    // Tăng mỗi khi thế cờ đổi (đi, hoàn tác) để nước máy tính muộn không áp vào thế khác
    private int version;
    // Các nước đã đi dạng UCI từ thế khai cuộc (chỉ giữ cho trận với máy)
    private final List<String> moveHistory = new ArrayList<>();

    public boolean isAiGame() {
        return aiLevel > 0;
    }
}
