package com.chessxiangqi.xiangqi_backend.config;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

public class CustomHandshakeHandler extends DefaultHandshakeHandler {
    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String username = (String) attributes.get("username");
        System.out.println("[BE] CustomHandshakeHandler - Principal username: " + username);
        if (username == null) {
            username = "anon-" + System.currentTimeMillis();
        }
        String finalUsername = username;
        return () -> finalUsername;
    }
}