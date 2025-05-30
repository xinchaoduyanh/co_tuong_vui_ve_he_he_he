package com.chessxiangqi.xiangqi_backend.model;

import java.util.Date;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity
public class TournamentRound {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private int roundNumber;
    private String tournamentId;
    private Date startTime;
    private Date endTime;
} 