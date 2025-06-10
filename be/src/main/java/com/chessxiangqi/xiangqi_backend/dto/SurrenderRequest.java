package com.chessxiangqi.xiangqi_backend.dto;

import lombok.Data;

@Data
public class SurrenderRequest {
    private String matchId;
    private String playerId;
} 