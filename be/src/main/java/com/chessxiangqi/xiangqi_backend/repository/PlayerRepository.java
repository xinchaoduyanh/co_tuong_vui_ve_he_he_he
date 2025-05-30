package com.chessxiangqi.xiangqi_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chessxiangqi.xiangqi_backend.model.Player;

public interface PlayerRepository extends JpaRepository<Player, String> {
    Player findByUsername(String username);
    boolean existsByUsername(String username);
} 