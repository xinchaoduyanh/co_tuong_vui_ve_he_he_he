package com.chessxiangqi.xiangqi_backend.strategy.leaderboard;

import java.util.List;

import com.chessxiangqi.xiangqi_backend.model.Player;

// Quản lý bảng xếp hạng với chiến lược sắp xếp động
public class Leaderboard {
    private ILeaderboardStrategy strategy;
    private List<Player> players;

    public Leaderboard(List<Player> players, ILeaderboardStrategy strategy) {
        this.players = players;
        this.strategy = strategy;
    }

    public void setStrategy(ILeaderboardStrategy strategy) {
        this.strategy = strategy;
    }

    // Lấy danh sách top player theo chiến lược hiện tại
    public List<Player> showTopPlayers() {
        return strategy.sort(players);
    }
}