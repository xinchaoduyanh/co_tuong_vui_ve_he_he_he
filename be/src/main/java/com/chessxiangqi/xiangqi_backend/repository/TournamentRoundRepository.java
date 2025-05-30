package com.chessxiangqi.xiangqi_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chessxiangqi.xiangqi_backend.model.TournamentRound;

public interface TournamentRoundRepository extends JpaRepository<TournamentRound, String> {
} 