package com.chessxiangqi.xiangqi_backend.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    private static final long CHALLENGE_TIMEOUT_SECONDS = 8;

    // Lưu trữ các lời thách đấu đang chờ theo targetUsername -> challengerUsername -> PendingChallenge
    private final Map<String, Map<String, PendingChallenge>> pendingChallenges = new ConcurrentHashMap<>();

    // Dọn dẹp các pending challenge đã hết hạn
    private void cleanupExpiredChallenges(String targetUsername) {
        Map<String, PendingChallenge> challengesForTarget = pendingChallenges.get(targetUsername);
        if (challengesForTarget == null) return;
        LocalDateTime now = LocalDateTime.now();
        
        List<String> expiredChallengers = new ArrayList<>();
        challengesForTarget.entrySet().removeIf(entry -> {
            PendingChallenge c = entry.getValue();
            if (Duration.between(c.getTimestamp(), now).getSeconds() > CHALLENGE_TIMEOUT_SECONDS) {
                // Gửi thông báo từ chối do hết hạn
                log.info("[BE-CHALLENGE-CLEANUP] Expired challenge from {} to {}. Sending rejection.", c.getChallengerUsername(), targetUsername);
                Map<String, String> response = new java.util.HashMap<>();
                response.put("type", "CHALLENGE_REJECTED");
                response.put("from", targetUsername);
                response.put("message", "Lời mời thách đấu đã hết hạn.");
                messagingTemplate.convertAndSendToUser(
                    c.getChallengerUsername(),
                    "/queue/challenge",
                    response
                );
                return true;
            }
            return false;
        });

        if (challengesForTarget.isEmpty()) {
            pendingChallenges.remove(targetUsername);
            log.info("[BE-CHALLENGE-CLEANUP] Removed empty pending challenges list for {}", targetUsername);
        }
    }

    public void sendChallenge(String challengerUsername, String targetUsername) {
        cleanupExpiredChallenges(targetUsername);
        log.info("[BE-13] Processing challenge from {} to {}", challengerUsername, targetUsername);
        
        // Kiểm tra người chơi có thể nhận thách đấu không
        if (!playerService.canBeChallenged(targetUsername)) {
            log.warn("[BE-14] Player {} cannot be challenged", targetUsername);
            Map<String, String> errorResponse = new java.util.HashMap<>();
            errorResponse.put("type", "CHALLENGE_ERROR");
            errorResponse.put("message", "Người chơi không thể nhận thách đấu lúc này");
            messagingTemplate.convertAndSendToUser(
                challengerUsername,
                "/queue/challenge",
                errorResponse
            );
            return;
        }

        // Kiểm tra nếu lời thách đấu tương tự đã tồn tại
        Map<String, PendingChallenge> challengesForTarget = pendingChallenges.computeIfAbsent(targetUsername, k -> new ConcurrentHashMap<>());
        if (challengesForTarget.containsKey(challengerUsername)) {
            log.warn("[BE-13.1] Challenge from {} to {} is already pending. Ignoring.", challengerUsername, targetUsername);
            Map<String, String> infoResponse = new java.util.HashMap<>();
            infoResponse.put("type", "CHALLENGE_INFO");
            infoResponse.put("message", "Bạn đã gửi lời thách đấu đến người chơi này. Vui lòng chờ phản hồi.");
            messagingTemplate.convertAndSendToUser(
                challengerUsername,
                "/queue/challenge",
                infoResponse
            );
            return;
        }

        // Thêm vào danh sách thách đấu đang chờ
        challengesForTarget.put(challengerUsername, new PendingChallenge(challengerUsername, targetUsername));

        log.info("[BE-15] Added challenge to pending list. Current pending challenges for {}: {}", 
            targetUsername, 
            getPendingChallengesForUser(targetUsername));

        // Gửi thông báo thách đấu cho người chơi mục tiêu
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("type", "CHALLENGE_RECEIVED");
        response.put("from", challengerUsername);
        response.put("challenger", challengerUsername);
        response.put("target", targetUsername);

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
        log.info("[BE-CHALLENGE-ACCEPT] Processing challenge acceptance from {} to {}", targetUsername, challengerUsername);
        
        // Xóa tất cả các lời thách đấu đang chờ của targetUsername
        Map<String, PendingChallenge> challenges = pendingChallenges.remove(targetUsername);
        if (challenges != null) {
            log.info("[BE-CHALLENGE-ACCEPT] Removed {} pending challenges for {}", challenges.size(), targetUsername);
            // Gửi thông báo từ chối cho tất cả các người thách đấu khác
            challenges.forEach((otherChallenger, pendingChallenge) -> {
                if (!otherChallenger.equals(challengerUsername)) {
                    log.info("[BE-CHALLENGE-ACCEPT] Sending rejection to other challenger: {}", otherChallenger);
                    Map<String, String> rejectResponse = new java.util.HashMap<>();
                    rejectResponse.put("type", "CHALLENGE_REJECTED");
                    rejectResponse.put("from", targetUsername);
                    rejectResponse.put("message", String.format("Người chơi %s đã chấp nhận lời thách đấu từ người chơi khác.", targetUsername));
                    messagingTemplate.convertAndSendToUser(
                        otherChallenger,
                        "/queue/challenge",
                        rejectResponse
                    );
                    log.info("[BE-CHALLENGE-ACCEPT] Rejection sent to {}. Message: {}", otherChallenger, rejectResponse);
                }
            });
        }
    }

    public void rejectChallenge(String challengerUsername, String targetUsername) {
        log.info("[BE-CHALLENGE-REJECT] Processing challenge rejection from {} to {}", targetUsername, challengerUsername);

        Map<String, PendingChallenge> challengesForTarget = pendingChallenges.get(targetUsername);
        
        if (challengesForTarget != null) {
            if (challengesForTarget.remove(challengerUsername) != null) {
                log.info("[BE-CHALLENGE-REJECT] Removed challenge from pending list for {}. Challenger: {}", targetUsername, challengerUsername);
            } else {
                log.warn("[BE-CHALLENGE-REJECT] Challenge from {} to {} not found in pending list for removal (or already removed).".formatted(challengerUsername, targetUsername));
            }

            if (challengesForTarget.isEmpty()) {
                pendingChallenges.remove(targetUsername);
                log.info("[BE-CHALLENGE-REJECT] Removed empty pending challenges list for {}", targetUsername);
            }
        } else {
            log.warn("[BE-CHALLENGE-REJECT] No pending challenges found for target {}.", targetUsername);
        }

        // Luôn gửi thông báo từ chối cho người thách đấu nếu phương thức này được gọi
        Map<String, String> response = new java.util.HashMap<>();
        response.put("type", "CHALLENGE_REJECTED");
        response.put("from", targetUsername);
        response.put("message", String.format("Người chơi %s đã từ chối lời thách đấu của bạn.", targetUsername));

        log.info("[BE-CHALLENGE-REJECT] Sending rejection notification to {}. Message: {}", challengerUsername, response);
        messagingTemplate.convertAndSendToUser(
            challengerUsername,
            "/queue/challenge",
            response
        );
    }

    public List<String> getPendingChallengesForUser(String username) {
        cleanupExpiredChallenges(username);
        Map<String, PendingChallenge> challenges = pendingChallenges.get(username);
        if (challenges == null) {
            log.debug("[BE-25] No pending challenges found for {}", username);
            return new ArrayList<>();
        }
        List<String> challengers = new ArrayList<>(challenges.keySet());
        log.debug("[BE-26] Found {} pending challenges for {}", challengers.size(), username);
        return challengers;
    }
} 