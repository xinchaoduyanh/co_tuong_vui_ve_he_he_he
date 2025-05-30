package com.chessxiangqi.xiangqi_backend.model;

import java.util.Date;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity
public class Tournament {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;
    private String description;
    private int totalRounds;
    private String status; // UPCOMING | ONGOING | FINISHED
    private Date createdAt;
    private Date startedAt;
    private Date endDate;
} 