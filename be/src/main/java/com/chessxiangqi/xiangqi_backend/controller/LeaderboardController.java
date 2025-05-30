package com.chessxiangqi.xiangqi_backend.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chessxiangqi.xiangqi_backend.dto.ApiResponse;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;
import com.chessxiangqi.xiangqi_backend.strategy.leaderboard.Leaderboard;
import com.chessxiangqi.xiangqi_backend.strategy.leaderboard.SortByElo;
import com.chessxiangqi.xiangqi_backend.strategy.leaderboard.SortByWinRate;

@RestController
@RequestMapping("/api/leaderboard")
@CrossOrigin(origins = "http://localhost:3000") // Cho phép FE gọi API
public class LeaderboardController {
    @Autowired
    private PlayerRepository playerRepository;
    // Xem bảng xếp hạng theo tổng điểm
    @GetMapping("/total-points")
    public ResponseEntity<ApiResponse<List<Player>>> getLeaderboardByTotalPoints() {
        List<Player> players = playerRepository.findAll();
        Leaderboard leaderboard = new Leaderboard(players, new SortByElo());
        List<Player> topPlayers = leaderboard.showTopPlayers().stream()
            .limit(10)
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(topPlayers));
    }

    // Xem bảng xếp hạng theo tỉ lệ thắng
    @GetMapping("/win-rate")
    public ResponseEntity<ApiResponse<List<Player>>> getLeaderboardByWinRate() {
        List<Player> players = playerRepository.findAll();
        Leaderboard leaderboard = new Leaderboard(players, new SortByWinRate());
        List<Player> topPlayers = leaderboard.showTopPlayers().stream()
            .limit(10)
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(topPlayers));
    }
}