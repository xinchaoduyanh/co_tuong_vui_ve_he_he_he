package com.chessxiangqi.xiangqi_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.dto.LoginRequest;
import com.chessxiangqi.xiangqi_backend.dto.RegisterRequest;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;

@Service
public class AuthService {

    @Autowired
    private PlayerRepository playerRepository;

    public boolean existsByUsername(String username) {
        return playerRepository.existsByUsername(username);
    }

    public Player register(RegisterRequest request) {
        Player player = new Player();
        player.setUsername(request.getUsername());
        player.setPassword(request.getPassword());
        player.setElo(1250);
        return playerRepository.save(player);
    }

    public Player login(LoginRequest request) {
        Player player = playerRepository.findByUsername(request.getUsername());
        if (player != null && player.getPassword().equals(request.getPassword())) {
            return player;
        }
        return null;
    }
}