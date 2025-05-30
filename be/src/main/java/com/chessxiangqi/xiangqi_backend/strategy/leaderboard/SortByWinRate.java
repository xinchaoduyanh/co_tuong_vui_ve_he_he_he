package com.chessxiangqi.xiangqi_backend.strategy.leaderboard;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import com.chessxiangqi.xiangqi_backend.model.Player;

// Sắp xếp theo tỉ lệ thắng
public class SortByWinRate implements ILeaderboardStrategy {
    @Override
    public List<Player> sort(List<Player> players) {
        return players.stream()
            .sorted(Comparator.comparingDouble(
                p -> -((p.getTotalMatches() > 0) ? ((double)p.getWins() / p.getTotalMatches()) : 0)
            ))
            .collect(Collectors.toList());
    }
}