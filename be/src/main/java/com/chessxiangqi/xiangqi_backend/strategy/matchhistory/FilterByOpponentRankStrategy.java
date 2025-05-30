package com.chessxiangqi.xiangqi_backend.strategy.matchhistory;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;
 
// Lọc lịch sử đấu theo rank đối thủ
public class FilterByOpponentRankStrategy implements IMatchHistoryViewStrategy {
    @Override
    public List<PlayerMatch> filterMatchByPlayerID(Player player, List<PlayerMatch> playerMatches) {
        return playerMatches.stream()
            .filter(pm -> pm.getPlayerId().equals(player.getId()) || pm.getOpponent().getId().equals(player.getId()))
            .sorted(Comparator.comparing(pm -> pm.getOpponent().getElo(), Comparator.reverseOrder()))
            .collect(Collectors.toList());
    }
}