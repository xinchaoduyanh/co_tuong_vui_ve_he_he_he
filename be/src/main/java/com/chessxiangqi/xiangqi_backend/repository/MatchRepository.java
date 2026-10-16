package com.chessxiangqi.xiangqi_backend.repository;

import java.util.Date;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.chessxiangqi.xiangqi_backend.model.Match;

public interface MatchRepository extends JpaRepository<Match, String> {

    // Trận người-người chưa kết thúc, tạo sau mốc {since}; loại trận AI và giải đấu
    @Query("SELECT m FROM Match m WHERE m.endDate IS NULL AND m.isAIGame = false "
        + "AND m.isTournamentMatch = false AND m.createdAt > :since "
        + "AND (m.player1.id = :playerId OR m.player2.id = :playerId) ORDER BY m.createdAt DESC")
    List<Match> findActiveByPlayerId(@Param("playerId") String playerId, @Param("since") Date since);
} 