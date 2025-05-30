package com.chessxiangqi.xiangqi_backend.config;

import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

public class UserHandshakeInterceptor implements HandshakeInterceptor {
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        // Lấy username từ query param
        String username = null;
        if (request instanceof ServletServerHttpRequest servletRequest) {
            username = servletRequest.getServletRequest().getParameter("username");
        }
        if (username == null) {
            return false; // Reject connection if no username
        }
        System.out.println("[BE] HandshakeInterceptor - username from query param: " + username);
        attributes.put("username", username);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                              WebSocketHandler wsHandler, Exception exception) {
    }
}
