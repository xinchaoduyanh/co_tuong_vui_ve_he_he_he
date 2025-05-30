package com.chessxiangqi.xiangqi_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;
import com.chessxiangqi.xiangqi_backend.repository.MatchRepository;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;

@Service
public class PlayerMatchService {
    @Autowired
    private PlayerMatchRepository playerMatchRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private PlayerService playerService;

    public void createPlayerMatchAndUpdatePlayers(Match match, String winnerId) {
        Player p1 = match.getPlayer1();
        Player p2 = match.getPlayer2();
        int elo1 = p1.getElo();
        int elo2 = p2.getElo();
        int basePoint = 20;
        double ratio = (double) Math.max(elo1, elo2) / Math.min(elo1, elo2);
        int pointChange;
        String result1, result2;

        if (winnerId == null) {
            result1 = result2 = "DRAW";
            pointChange = 0;
        } else if (winnerId.equals(p1.getId())) {
            result1 = "WIN"; result2 = "LOSE";
            pointChange = elo1 < elo2 ? (int) Math.round(basePoint * ratio) : (int) Math.round(basePoint / ratio);
        } else {
            result1 = "LOSE"; result2 = "WIN";
            pointChange = elo2 < elo1 ? (int) Math.round(basePoint * ratio) : (int) Math.round(basePoint / ratio);
        }

        // Tạo PlayerMatch cho cả 2
        PlayerMatch pm1 = new PlayerMatch();
        pm1.setPlayerId(p1.getId());
        pm1.setOpponent(p2);
        pm1.setMatchId(match.getId());
        pm1.setResult(result1);
        pm1.setEloChange(result1.equals("WIN") ? pointChange : (result1.equals("LOSE") ? -pointChange : 0));
        playerMatchRepository.save(pm1);

        PlayerMatch pm2 = new PlayerMatch();
        pm2.setPlayerId(p2.getId());
        pm2.setOpponent(p1);
        pm2.setMatchId(match.getId());
        pm2.setResult(result2);
        pm2.setEloChange(result2.equals("WIN") ? pointChange : (result2.equals("LOSE") ? -pointChange : 0));
        playerMatchRepository.save(pm2);

        // Cập nhật Player
        playerService.applyMatchResult(p1, pm1.getEloChange(), result1);
        playerService.applyMatchResult(p2, pm2.getEloChange(), result2);
    }

    public void createPlayerMatch(Player player, Player opponent, Match match) {
        PlayerMatch pm = new PlayerMatch();
        pm.setPlayerId(player.getId());
        pm.setOpponent(opponent);
        pm.setMatchId(match.getId());
        pm.setResult("IN_PROGRESS");
        pm.setEloChange(0);
        playerMatchRepository.save(pm);
    }
} 