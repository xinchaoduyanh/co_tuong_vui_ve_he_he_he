package com.chessxiangqi.xiangqi_backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Data
@Entity
public class PlayerMatch {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String playerId;
    private String matchId;
    private String result; // WIN, DRAW, LOSE
    private int eloChange;

    @ManyToOne
    @JoinColumn(name = "opponent_id")
    private Player opponent;
} 