package com.chessxiangqi.xiangqi_backend.strategy.matchhistory;

import java.util.List;

import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;

// Quản lý lịch sử đấu với chiến lược lọc động
public class MatchHistoryViewer {
    private IMatchHistoryViewStrategy strategy;

    public MatchHistoryViewer(IMatchHistoryViewStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(IMatchHistoryViewStrategy strategy) {
        this.strategy = strategy;
    }

    public List<PlayerMatch> showHistory(Player player, List<PlayerMatch> playerMatches) {
        return strategy.filterMatchByPlayerID(player, playerMatches);
    }
}