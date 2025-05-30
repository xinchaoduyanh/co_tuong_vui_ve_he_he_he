package com.chessxiangqi.xiangqi_backend.strategy.leaderboard;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import com.chessxiangqi.xiangqi_backend.model.Player;

// Sắp xếp theo tổng điểm 
public class SortByElo implements ILeaderboardStrategy {
  @Override
  public List<Player> sort(List<Player> players) {
      return players.stream()
          .sorted(Comparator.comparingInt(Player::getElo).reversed())
          .collect(Collectors.toList());
  }
}
