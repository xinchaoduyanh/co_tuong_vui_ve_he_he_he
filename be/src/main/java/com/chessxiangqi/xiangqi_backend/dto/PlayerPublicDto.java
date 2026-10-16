package com.chessxiangqi.xiangqi_backend.dto;

import com.chessxiangqi.xiangqi_backend.model.Player;

import lombok.Data;

/** Thông tin công khai của người chơi gửi cho client (không có mật khẩu, email). */
@Data
public class PlayerPublicDto {
    private String id;
    private String username;
    private int elo;
    private int totalMatches;
    private int wins;
    private int loses;
    private int draws;

    public static PlayerPublicDto from(Player player) {
        PlayerPublicDto dto = new PlayerPublicDto();
        dto.setId(player.getId());
        dto.setUsername(player.getUsername());
        dto.setElo(player.getElo());
        dto.setTotalMatches(player.getTotalMatches());
        dto.setWins(player.getWins());
        dto.setLoses(player.getLoses());
        dto.setDraws(player.getDraws());
        return dto;
    }
}
