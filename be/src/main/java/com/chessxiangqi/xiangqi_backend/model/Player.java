package com.chessxiangqi.xiangqi_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Data;

@Data
@Entity
@Table(name = "players")
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
  
    @Column(nullable = false, unique = true)
    private String username;

    @JsonIgnore
    private String password;

    private String email;
    private int elo = 1500;
    private int totalMatches = 0;
    private int wins = 0;
    private int loses = 0;
    private int draws = 0;

    @Transient // Mark as transient to ignore in database operations
    private PlayerStatus status;
}
