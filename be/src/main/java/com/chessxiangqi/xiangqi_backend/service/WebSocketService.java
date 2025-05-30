package com.chessxiangqi.xiangqi_backend.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketService {
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendSessionId(String sessionId, String value) {
        messagingTemplate.convertAndSendToUser(
            sessionId,
            "/queue/session",
            value
        );
    }
} 