package com.chessxiangqi.xiangqi_backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chessxiangqi.xiangqi_backend.dto.ApiResponse;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;
import com.chessxiangqi.xiangqi_backend.strategy.matchhistory.FilterByOpponentRankStrategy;
import com.chessxiangqi.xiangqi_backend.strategy.matchhistory.FilterByRecentMatchStrategy;
import com.chessxiangqi.xiangqi_backend.strategy.matchhistory.MatchHistoryViewer;

@RestController
@RequestMapping("/api/match-history")
@CrossOrigin(origins = "http://localhost:3000") // Cho phép FE gọi API
public class MatchHistoryController {
    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private PlayerMatchRepository playerMatchRepository;

    // Xem lịch sử đấu gần nhất
    @GetMapping("/recent/{username}")
    public ResponseEntity<ApiResponse<List<PlayerMatch>>> getRecentMatches(@PathVariable String username) {
        Player player = playerRepository.findByUsername(username);
        if (player == null) {
            return ResponseEntity.status(404)
                .body(ApiResponse.error("Không tìm thấy người dùng: " + username));
        }

        // Log player id
        System.out.println("DEBUG - playerId: " + player.getId());

        List<PlayerMatch> playerMatches = playerMatchRepository.findAllByPlayerIdWithOpponent(player.getId());
        // Log toàn bộ match id, player1Id, player2Id
        for (PlayerMatch pm : playerMatches) {
            System.out.println("DEBUG - matchId: " + pm.getMatchId() +
                ", player1Id: " + pm.getPlayerId() +
                ", player2Id: " + pm.getOpponent().getId());
        }

        MatchHistoryViewer viewer = new MatchHistoryViewer(new FilterByRecentMatchStrategy());
        return ResponseEntity.ok(ApiResponse.success(viewer.showHistory(player, playerMatches)));
    }

    // Xem lịch sử đấu theo rank đối thủ
    @GetMapping("/opponent-rank/{username}")
    public ResponseEntity<ApiResponse<List<PlayerMatch>>> getMatchesByOpponentRank(@PathVariable String username) {
        Player player = playerRepository.findByUsername(username);
        if (player == null) {
            return ResponseEntity.status(404)
                .body(ApiResponse.error("Không tìm thấy người dùng: " + username));
        }
        List<PlayerMatch> playerMatches = playerMatchRepository.findAllByPlayerIdWithOpponent(player.getId());
        MatchHistoryViewer viewer = new MatchHistoryViewer(new FilterByOpponentRankStrategy());
        return ResponseEntity.ok(ApiResponse.success(viewer.showHistory(player, playerMatches)));
    }
}