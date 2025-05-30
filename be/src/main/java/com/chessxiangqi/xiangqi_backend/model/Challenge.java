package com.chessxiangqi.xiangqi_backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Challenge {
    private String type;  // CHALLENGE_RECEIVED, CHALLENGE_ACCEPTED, CHALLENGE_REJECTED, ERROR
    private String from;  // Username của người gửi thách đấu
    private String message;  // Thông báo lỗi nếu có
    private String gameId;  // ID của game khi thách đấu được chấp nhận

    public Challenge(String type, String from) {
        this.type = type;
        this.from = from;
    }

    public Challenge(String type, String from, String message) {
        this.type = type;
        this.from = from;
        this.message = message;
    }
} 