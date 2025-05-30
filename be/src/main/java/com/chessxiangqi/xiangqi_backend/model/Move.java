package com.chessxiangqi.xiangqi_backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity
public class Move {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String matchId;
    private int turnNumber;
    private String moveDescription;
    private boolean isCheck;
    private boolean isCheckmate;
    private String boardState;
    private String nextTurn;
}
