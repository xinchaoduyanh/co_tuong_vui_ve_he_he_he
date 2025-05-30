package com.chessxiangqi.xiangqi_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;

public interface PlayerMatchRepository extends JpaRepository<PlayerMatch, String> {
    List<PlayerMatch> findByMatchId(String matchId);

    @Query("SELECT pm FROM PlayerMatch pm JOIN FETCH pm.opponent WHERE pm.playerId = :playerId")
    List<PlayerMatch> findAllByPlayerIdWithOpponent(@Param("playerId") String playerId);
} 