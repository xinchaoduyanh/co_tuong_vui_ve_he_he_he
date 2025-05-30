package com.chessxiangqi.xiangqi_backend.model;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class PendingChallenge {
    private String challengerUsername;
    private String targetUsername;
    private LocalDateTime timestamp;

    public PendingChallenge(String challengerUsername, String targetUsername) {
        this.challengerUsername = challengerUsername;
        this.targetUsername = targetUsername;
        this.timestamp = LocalDateTime.now();
    }
} 