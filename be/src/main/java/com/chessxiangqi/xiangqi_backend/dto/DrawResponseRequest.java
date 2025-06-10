package com.chessxiangqi.xiangqi_backend.dto;

import lombok.Data;

@Data
public class DrawResponseRequest {
    private String matchId;
    private String playerId;
    private boolean accepted;
} 