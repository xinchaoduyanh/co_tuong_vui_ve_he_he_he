package com.chessxiangqi.xiangqi_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chessxiangqi.xiangqi_backend.model.Match;

public interface MatchRepository extends JpaRepository<Match, String> {
} 