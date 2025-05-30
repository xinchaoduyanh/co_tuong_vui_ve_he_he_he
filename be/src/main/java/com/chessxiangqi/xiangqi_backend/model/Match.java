package com.chessxiangqi.xiangqi_backend.model;

import java.util.Date;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Data
@Entity
public class Match {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    private Player player1; // Đỏ

    @ManyToOne
    private Player player2; // Đen

    private String aiModelId;
    private Date startDate;
    private Date endDate;
    private String result; // Player | AIModel | DRAW
    private boolean isTournamentMatch;
} 