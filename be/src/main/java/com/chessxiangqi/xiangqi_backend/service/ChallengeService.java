package com.chessxiangqi.xiangqi_backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.PendingChallenge;

@Service
public class ChallengeService {
    
    private static final Logger log = LoggerFactory.getLogger(ChallengeService.class);

    @Autowired
    private PlayerService playerService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Lưu trữ các lời thách đấu đang chờ theo targetUsername
    private final Map<String, List<PendingChallenge>> pendingChallenges = new ConcurrentHashMap<>();

    public void sendChallenge(String challengerUsername, String targetUsername) {
        log.info("[BE-13] Processing challenge from {} to {}", challengerUsername, targetUsername);
        
        // Kiểm tra người chơi có thể nhận thách đấu không
        if (!playerService.canBeChallenged(targetUsername)) {
            log.warn("[BE-14] Player {} cannot be challenged", targetUsername);
            messagingTemplate.convertAndSendToUser(
                challengerUsername,
                "/queue/challenge.error",
                "Người chơi không thể nhận thách đấu lúc này"
            );
            return;
        }

        // Thêm vào danh sách thách đấu đang chờ
        pendingChallenges.computeIfAbsent(targetUsername, k -> new ArrayList<>())
            .add(new PendingChallenge(challengerUsername, targetUsername));

        log.info("[BE-15] Added challenge to pending list. Current pending challenges for {}: {}", 
            targetUsername, 
            getPendingChallengesForUser(targetUsername));

        // Gửi thông báo thách đấu cho người chơi mục tiêu
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("type", "CHALLENGE_RECEIVED");
        response.put("from", challengerUsername);
        response.put("challenger", challengerUsername);
        response.put("target", targetUsername);
        response.put("pendingChallenges", getPendingChallengesForUser(targetUsername));

        log.info("[BE-16] Sending challenge notification to {} via /queue/challenge", targetUsername);
        log.info("[BE-16.1] Challenge message content: {}", response);
        
        messagingTemplate.convertAndSendToUser(
            targetUsername,
            "/queue/challenge",
            response
        );
        log.info("[BE-16.2] Challenge notification sent successfully");

        // Gửi thông báo xác nhận cho người gửi thách đấu
        Map<String, Object> challengerResponse = new java.util.HashMap<>();
        challengerResponse.put("type", "CHALLENGE_SENT");
        challengerResponse.put("to", targetUsername);
        challengerResponse.put("status", "PENDING");

        log.info("[BE-17] Sending confirmation to challenger {} via /queue/challenge", challengerUsername);
        log.info("[BE-17.1] Confirmation message content: {}", challengerResponse);

        messagingTemplate.convertAndSendToUser(
            challengerUsername,
            "/queue/challenge",
            challengerResponse
        );
        log.info("[BE-17.2] Confirmation sent successfully");
    }

    public void acceptChallenge(String challengerUsername, String targetUsername) {
        log.info("[BE-17] Processing challenge acceptance from {} to {}", targetUsername, challengerUsername);
        
        // Xóa tất cả các lời thách đấu đang chờ của targetUsername
        List<PendingChallenge> challenges = pendingChallenges.remove(targetUsername);
        if (challenges != null) {
            log.info("[BE-18] Removing {} pending challenges for {}", challenges.size(), targetUsername);
            // Gửi thông báo từ chối cho tất cả các người thách đấu khác
            challenges.stream()
                .filter(c -> !c.getChallengerUsername().equals(challengerUsername))
                .forEach(c -> {
                    log.info("[BE-19] Sending rejection to other challenger: {}", c.getChallengerUsername());
                    Map<String, String> rejectResponse = new java.util.HashMap<>();
                    rejectResponse.put("type", "CHALLENGE_REJECTED");
                    rejectResponse.put("from", targetUsername);
                    rejectResponse.put("message", "Người chơi đã chấp nhận lời thách đấu khác");
                    messagingTemplate.convertAndSendToUser(
                        c.getChallengerUsername(),
                        "/queue/challenge",
                        rejectResponse
                    );
                });
        }

        // Gửi thông báo cho cả hai người chơi
        Map<String, String> response = new java.util.HashMap<>();
        response.put("type", "CHALLENGE_ACCEPTED");
        response.put("from", targetUsername);

        log.info("[BE-20] Sending acceptance notifications to both players");
        messagingTemplate.convertAndSendToUser(
            challengerUsername,
            "/queue/challenge",
            response
        );
    }

    public void rejectChallenge(String challengerUsername, String targetUsername) {
        log.info("[BE-21] Processing challenge rejection from {} to {}", targetUsername, challengerUsername);
        
        // Xóa lời thách đấu cụ thể này khỏi danh sách đang chờ
        List<PendingChallenge> challenges = pendingChallenges.get(targetUsername);
        if (challenges != null) {
            int initialSize = challenges.size();
            challenges.removeIf(c -> c.getChallengerUsername().equals(challengerUsername));
            log.info("[BE-22] Removed challenge from pending list. Before: {}, After: {}", 
                initialSize, challenges.size());
            if (challenges.isEmpty()) {
                pendingChallenges.remove(targetUsername);
                log.info("[BE-23] Removed empty pending challenges list for {}", targetUsername);
            }
        }

        // Gửi thông báo từ chối cho người thách đấu
        Map<String, String> response = new java.util.HashMap<>();
        response.put("type", "CHALLENGE_REJECTED");
        response.put("from", targetUsername);

        log.info("[BE-24] Sending rejection notification to {}", challengerUsername);
        messagingTemplate.convertAndSendToUser(
            challengerUsername,
            "/queue/challenge",
            response
        );
    }

    public List<String> getPendingChallengesForUser(String username) {
        List<PendingChallenge> challenges = pendingChallenges.get(username);
        if (challenges == null) {
            log.debug("[BE-25] No pending challenges found for {}", username);
            return new ArrayList<>();
        }
        List<String> challengers = challenges.stream()
            .map(PendingChallenge::getChallengerUsername)
            .collect(Collectors.toList());
        log.debug("[BE-26] Found {} pending challenges for {}", challengers.size(), username);
        return challengers;
    }
} 