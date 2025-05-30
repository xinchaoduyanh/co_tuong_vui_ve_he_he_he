package com.chessxiangqi.xiangqi_backend.dto;

import lombok.Data;

@Data
public class ChallengeMessage {
    private String challengerUsername;
    private String targetUsername;
} 