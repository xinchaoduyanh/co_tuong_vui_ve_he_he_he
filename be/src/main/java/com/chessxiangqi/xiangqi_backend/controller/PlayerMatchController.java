package com.chessxiangqi.xiangqi_backend.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;
import com.chessxiangqi.xiangqi_backend.service.PlayerMatchService;

@RestController
@RequestMapping("/api/player-match")
public class PlayerMatchController {
    @Autowired
    private PlayerRepository playerRepository;
    @Autowired
    private PlayerMatchService playerMatchService;
    @Autowired
    private PlayerMatchRepository playerMatchRepository;

    @PostMapping("/win")
    public ResponseEntity<List<Map<String, Object>>> createWinMatch(@RequestParam String player1Id, @RequestParam String player2Id, @RequestParam String winnerId) {
        Player player1 = playerRepository.findById(player1Id).orElse(null);
        Player player2 = playerRepository.findById(player2Id).orElse(null);
        if (player1 == null || player2 == null) {
            return ResponseEntity.badRequest().build();
        }
        Match match = new Match();
        match.setPlayer1(player1);
        match.setPlayer2(player2);
        playerMatchService.createPlayerMatchAndUpdatePlayers(match, winnerId);
        List<PlayerMatch> playerMatches = playerMatchRepository.findByMatchId(match.getId());
        List<Map<String, Object>> details = playerMatches.stream().map(pm -> Map.<String, Object>of(
            "playerId", pm.getPlayerId(),
            "result", pm.getResult(),
            "opponent", pm.getOpponent().getUsername(),
            "eloChange", pm.getEloChange()
        )).collect(Collectors.toList());
        return ResponseEntity.ok(details);
    }

    @PostMapping("/draw")
    public ResponseEntity<List<Map<String, Object>>> createDrawMatch(@RequestParam String player1Id, @RequestParam String player2Id) {
        Player player1 = playerRepository.findById(player1Id).orElse(null);
        Player player2 = playerRepository.findById(player2Id).orElse(null);
        if (player1 == null || player2 == null) {
            return ResponseEntity.badRequest().build();
        }
        Match match = new Match();
        match.setPlayer1(player1);
        match.setPlayer2(player2);
        playerMatchService.createPlayerMatchAndUpdatePlayers(match, null);
        List<PlayerMatch> playerMatches = playerMatchRepository.findByMatchId(match.getId());
        List<Map<String, Object>> details = playerMatches.stream().map(pm -> Map.<String, Object>of(
            "playerId", pm.getPlayerId(),
            "result", pm.getResult(),
            "opponent", pm.getOpponent().getUsername(),
            "eloChange", pm.getEloChange()
        )).collect(Collectors.toList());
        return ResponseEntity.ok(details);
    }
    
} 