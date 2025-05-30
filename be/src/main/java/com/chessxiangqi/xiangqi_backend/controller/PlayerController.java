package com.chessxiangqi.xiangqi_backend.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chessxiangqi.xiangqi_backend.dto.ApiResponse;
import com.chessxiangqi.xiangqi_backend.model.OnlinePlayer;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.service.PlayerService;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    @Autowired
    private PlayerService playerService;

    @GetMapping("/online")
    public ResponseEntity<ApiResponse<List<OnlinePlayer>>> getOnlinePlayers() {
        return ResponseEntity.ok(ApiResponse.success(playerService.getOnlinePlayers()));
    }

    @GetMapping("/online/refresh")
    public ResponseEntity<ApiResponse<List<OnlinePlayer>>> refreshOnlinePlayers() {
        List<OnlinePlayer> players = playerService.getOnlinePlayers();
        return ResponseEntity.ok(ApiResponse.success(players));
    }

    @PostMapping("/update-total-matches")
    public ResponseEntity<String> updateTotalMatches(@RequestParam String username, @RequestParam int totalMatches) {
        Optional<Player> playerOpt = playerService.getPlayerByUsername(username);
        if (playerOpt.isPresent()) {
            Player player = playerOpt.get();
            player.setTotalMatches(totalMatches);
            playerService.updatePlayer(player.getId(), player);
            return ResponseEntity.ok("Updated total matches for " + username + " to " + totalMatches);
        }
        return ResponseEntity.notFound().build();
    }
} 