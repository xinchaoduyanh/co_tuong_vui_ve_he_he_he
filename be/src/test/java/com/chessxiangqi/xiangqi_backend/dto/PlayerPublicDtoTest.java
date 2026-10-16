package com.chessxiangqi.xiangqi_backend.dto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.chessxiangqi.xiangqi_backend.model.Player;
import com.fasterxml.jackson.databind.ObjectMapper;

class PlayerPublicDtoTest {

    @Test
    void serializedPlayerHasNoPasswordOrEmail() throws Exception {
        Player player = new Player();
        player.setId("p1-id");
        player.setUsername("player1");
        player.setPassword("secret");
        player.setEmail("player1@example.com");

        String json = new ObjectMapper().writeValueAsString(PlayerPublicDto.from(player));

        assertTrue(json.contains("\"username\":\"player1\""));
        assertFalse(json.contains("secret"));
        assertFalse(json.contains("password"));
        assertFalse(json.contains("email"));
    }
}
