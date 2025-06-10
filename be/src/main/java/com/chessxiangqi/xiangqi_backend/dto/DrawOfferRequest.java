package com.chessxiangqi.xiangqi_backend.dto;

import lombok.Data;

@Data
public class DrawOfferRequest {
    private String matchId;
    private String playerId;
} 