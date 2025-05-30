package com.chessxiangqi.xiangqi_backend.strategy.leaderboard;

import java.util.List;

import com.chessxiangqi.xiangqi_backend.model.Player;

public interface ILeaderboardStrategy {
    List<Player> sort(List<Player> players);
}