package com.chessxiangqi.xiangqi_backend.repository;

import java.util.Date;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.chessxiangqi.xiangqi_backend.model.Match;

public interface MatchRepository extends JpaRepository<Match, String> {

    // Trận người-người chưa kết thúc, tạo sau mốc {since}; loại trận AI và giải đấu
    // JOIN FETCH để lấy luôn hai người chơi trong một truy vấn (tránh N+1)
    @Query("SELECT m FROM Match m JOIN FETCH m.player1 p1 JOIN FETCH m.player2 p2 "
        + "WHERE m.endDate IS NULL AND m.isAIGame = false "
        + "AND m.isTournamentMatch = false AND m.createdAt > :since "
        + "AND (p1.id = :playerId OR p2.id = :playerId) ORDER BY m.createdAt DESC")
    List<Match> findActiveByPlayerId(@Param("playerId") String playerId, @Param("since") Date since);

    @Query("SELECT m FROM Match m JOIN FETCH m.player1 p1 JOIN FETCH m.player2 p2 "
        + "WHERE m.endDate IS NULL AND m.isAIGame = false "
        + "AND m.isTournamentMatch = false AND m.createdAt > :since "
        + "AND (p1.username = :username OR p2.username = :username) ORDER BY m.createdAt DESC")
    List<Match> findActiveByUsername(@Param("username") String username, @Param("since") Date since);
} 