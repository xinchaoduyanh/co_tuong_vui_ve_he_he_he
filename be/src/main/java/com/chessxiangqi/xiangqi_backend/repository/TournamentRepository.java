package com.chessxiangqi.xiangqi_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chessxiangqi.xiangqi_backend.model.Tournament;

public interface TournamentRepository extends JpaRepository<Tournament, String> {
} 