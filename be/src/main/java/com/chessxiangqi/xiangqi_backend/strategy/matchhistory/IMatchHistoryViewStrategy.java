package com.chessxiangqi.xiangqi_backend.strategy.matchhistory;

import java.util.List;

import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;

public interface IMatchHistoryViewStrategy {
    List<PlayerMatch> filterMatchByPlayerID(Player player, List<PlayerMatch> playerMatches);
}