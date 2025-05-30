package com.chessxiangqi.xiangqi_backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity
public class TournamentParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String playerId;
    private String tournamentId;
    private int score;
    private int ranking;
    private String status;
} 