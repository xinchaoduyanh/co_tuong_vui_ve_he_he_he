package com.chessxiangqi.xiangqi_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.chessxiangqi.xiangqi_backend.model.Move;

@Repository
public interface MoveRepository extends JpaRepository<Move, String> {
    List<Move> findByMatchIdOrderByTurnNumberAsc(String matchId);
    Optional<Move> findTopByMatchIdOrderByTurnNumberDesc(String matchId);
} 