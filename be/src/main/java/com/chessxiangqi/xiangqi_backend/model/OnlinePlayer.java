package com.chessxiangqi.xiangqi_backend.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OnlinePlayer {
    private String id;
    private String username;
    private int elo;
    private int wins;
    private int loses;
    private int draws;
    private int totalMatches;
    private String sessionId;
    private long lastActiveTime;
    private PlayerStatus status;

    public OnlinePlayer(Player player, String sessionId) {
        // Copy all properties from Player
        this.id = player.getId();
        this.username = player.getUsername();
        this.elo = player.getElo();
        this.wins = player.getWins();
        this.loses = player.getLoses();
        this.draws = player.getDraws();
        this.totalMatches = player.getTotalMatches();
        this.status = PlayerStatus.ONLINE;
        
        // Set OnlinePlayer specific properties
        this.sessionId = sessionId;
        this.lastActiveTime = System.currentTimeMillis();
    }

    public boolean canBeChallenged() {
        return status == PlayerStatus.ONLINE;
    }

    public void updateLastActiveTime() {
        this.lastActiveTime = System.currentTimeMillis();
    }

    public boolean isActive() {
        // Consider player inactive if no activity for 5 minutes
        return System.currentTimeMillis() - lastActiveTime < 300000;
    }

    @Override
    public String toString() {
        return String.format("OnlinePlayer{id='%s', username='%s', status='%s', sessionId='%s'}", 
            id, username, status, sessionId);
    }
} 