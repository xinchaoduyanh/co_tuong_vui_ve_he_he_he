package com.chessxiangqi.xiangqi_backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.OnlinePlayer;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class PlayerService {
    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private PlayerMatchService playerMatchService;

    // Lưu trữ thông tin người chơi online theo sessionId
    private final Map<String, OnlinePlayer> onlinePlayersBySessionId = new ConcurrentHashMap<>();
    // Lưu trữ thông tin người chơi online theo username
    private final Map<String, OnlinePlayer> onlinePlayersByUsername = new ConcurrentHashMap<>();

    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    public Optional<Player> getPlayerById(String id) {
        return playerRepository.findById(id);
    }

    public Optional<Player> getPlayerByUsername(String username) {
        return Optional.ofNullable(playerRepository.findByUsername(username));
    }

    public Player createPlayer(Player player) {
        return playerRepository.save(player);
    }

    public Player updatePlayer(String id, Player player) {
        player.setId(id);
        return playerRepository.save(player);
    }

    public void deletePlayer(String id) {
        playerRepository.deleteById(id);
    }

    public void addOnlinePlayer(String username, String sessionId) {
        Player player = playerRepository.findByUsername(username);
        if (player != null) {
            OnlinePlayer onlinePlayer = new OnlinePlayer(player, sessionId);
            onlinePlayersBySessionId.put(sessionId, onlinePlayer);
            onlinePlayersByUsername.put(username, onlinePlayer);
            
            // Log người dùng mới online
            log.info("[STATUS] [ONLINE] {} - SessionId: {}", username, sessionId);
            
            // Log danh sách người đang online
            List<OnlinePlayer> onlinePlayers = new ArrayList<>(onlinePlayersByUsername.values());
            String onlineList = onlinePlayers.stream()
                .map(p -> String.format("[%s] %s", p.getStatus(), p.getUsername()))
                .collect(Collectors.joining(", "));
            log.info("[STATUS] Current online players: {}", onlineList);
        }
    }

    public void removeOnlinePlayerBySessionId(String sessionId) {
        OnlinePlayer player = onlinePlayersBySessionId.remove(sessionId);
        if (player != null) {
            onlinePlayersByUsername.remove(player.getUsername());
            log.info("[STATUS] [OFFLINE] {} - SessionId: {}", player.getUsername(), sessionId);
        }
    }

    public boolean isPlayerOnline(String username) {
        OnlinePlayer onlinePlayer = onlinePlayersByUsername.get(username);
        boolean isOnline = onlinePlayer != null && onlinePlayer.getStatus() == PlayerStatus.ONLINE;
        log.debug("[BE-30] Checking player online status - Username: {}, Is Online: {}", username, isOnline);
        return isOnline;
    }

    public boolean canBeChallenged(String username) {
        OnlinePlayer onlinePlayer = onlinePlayersByUsername.get(username);
        log.info("[BE-31] Checking if player can be challenged - Username: {}", username);
        log.info("[BE-31.1] Player exists in online list: {}", onlinePlayer != null);
        if (onlinePlayer != null) {
            log.info("[BE-31.2] Player status: {}", onlinePlayer.getStatus());
        }
        boolean canBeChallenged = onlinePlayer != null && onlinePlayer.getStatus() == PlayerStatus.ONLINE;
        log.info("[BE-31.3] Can be challenged: {}", canBeChallenged);
        return canBeChallenged;
    }

    public void updatePlayerStatus(String username, PlayerStatus status) {
        log.info("[STATUS] [{}] {}", status, username);
        OnlinePlayer onlinePlayer = onlinePlayersByUsername.get(username);
        if (onlinePlayer != null) {
            PlayerStatus oldStatus = onlinePlayer.getStatus();
            onlinePlayer.setStatus(status);
            log.info("[STATUS] Updated in-memory status - [{}] {} (was: {})", status, username, oldStatus);
        } else {
            log.warn("[STATUS] Cannot update status - Player not found in online list: {}", username);
        }
    }

    public List<String> getOnlineUsernames() {
        return onlinePlayersByUsername.values().stream()
            .filter(p -> p.getStatus() == PlayerStatus.ONLINE)
            .map(OnlinePlayer::getUsername)
            .collect(Collectors.toList());
    }

    public List<OnlinePlayer> getOnlinePlayers() {
        List<OnlinePlayer> players = onlinePlayersByUsername.values().stream()
            .filter(p -> p.getStatus() == PlayerStatus.ONLINE)
            .collect(Collectors.toList());
        log.info("[STATUS] Current online players: {}", 
            players.stream()
                .map(p -> String.format("[%s] %s", p.getStatus(), p.getUsername()))
                .collect(Collectors.joining(", ")));
        return players;
    }

    public void applyMatchResult(Player player, int eloChange, String result) {
        player.setElo(player.getElo() + eloChange);
        player.setTotalMatches(player.getTotalMatches() + 1);
        
        switch (result) {
            case "WIN":
                player.setWins(player.getWins() + 1);
                break;
            case "LOSE":
                player.setLoses(player.getLoses() + 1);
                break;
            case "DRAW":
                player.setDraws(player.getDraws() + 1);
                break;
        }
        
        playerRepository.save(player);
    }

    public void updatePlayerElo(String playerId, int eloChange) {
        Optional<Player> playerOpt = playerRepository.findById(playerId);
        if (playerOpt.isPresent()) {
            Player player = playerOpt.get();
            player.setElo(player.getElo() + eloChange);
            playerRepository.save(player);
        }
    }
} 