package com.chessxiangqi.xiangqi_backend.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.PendingChallenge;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;

import lombok.extern.slf4j.Slf4j;

/**
 * Lời mời thách đấu. Server quyết định hết hạn và gửi mọi trạng thái (kèm mã lỗi hoặc lý do)
 * cho cả hai phía, client chỉ hiển thị.
 */
@Slf4j
@Service
public class ChallengeService {

    public static final long CHALLENGE_TIMEOUT_SECONDS = 8;

    private static final String QUEUE = "/queue/challenge";

    @Autowired
    private PlayerService playerService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Lời mời đang chờ: người được mời -> (người mời -> lời mời)
    private final Map<String, Map<String, PendingChallenge>> pendingChallenges = new ConcurrentHashMap<>();

    /** Gửi lời mời. Mọi trường hợp không gửi được đều trả CHALLENGE_ERROR kèm mã. */
    public synchronized void sendChallenge(String challenger, String target) {
        if (challenger == null || target == null) {
            return;
        }
        expireAll();

        if (challenger.equals(target)) {
            sendError(challenger, target, "SELF", "Bạn không thể thách đấu chính mình.");
            return;
        }
        Optional<PlayerStatus> targetStatus = playerService.statusOf(target);
        if (targetStatus.isEmpty()) {
            sendError(challenger, target, "TARGET_OFFLINE", "Người chơi " + target + " hiện không online.");
            return;
        }
        if (targetStatus.get() == PlayerStatus.IN_GAME) {
            sendError(challenger, target, "TARGET_BUSY", "Người chơi " + target + " đang trong trận khác.");
            return;
        }
        if (playerService.statusOf(challenger).orElse(null) == PlayerStatus.IN_GAME) {
            sendError(challenger, target, "CHALLENGER_BUSY", "Bạn đang trong trận, không thể thách đấu lúc này.");
            return;
        }

        Map<String, PendingChallenge> incoming = pendingChallenges.computeIfAbsent(target, k -> new ConcurrentHashMap<>());
        if (incoming.containsKey(challenger)) {
            sendError(challenger, target, "ALREADY_PENDING", "Bạn đã gửi lời mời tới người chơi này. Vui lòng chờ phản hồi.");
            return;
        }
        Optional<String> otherTarget = findOutgoingTarget(challenger);
        if (otherTarget.isPresent()) {
            sendError(challenger, target, "ALREADY_PENDING",
                "Bạn đang có lời mời chờ phản hồi tới " + otherTarget.get() + ". Hãy huỷ lời mời đó trước.");
            return;
        }

        incoming.put(challenger, new PendingChallenge(challenger, target));
        log.info("[CHALLENGE] {} -> {} sent", challenger, target);

        Map<String, Object> received = payload("CHALLENGE_RECEIVED", challenger, target);
        received.put("from", challenger);
        messagingTemplate.convertAndSendToUser(target, QUEUE, received);

        messagingTemplate.convertAndSendToUser(challenger, QUEUE, payload("CHALLENGE_SENT", challenger, target));
    }

    /** Lời mời còn hiệu lực (chưa hết hạn, chưa bị huỷ). */
    public synchronized boolean isPending(String challenger, String target) {
        expireAll();
        Map<String, PendingChallenge> incoming = pendingChallenges.get(target);
        return incoming != null && incoming.containsKey(challenger);
    }

    /** Người được mời chấp nhận: các lời mời khác tới họ bị từ chối vì bận. */
    public synchronized void acceptChallenge(String challenger, String target) {
        Map<String, PendingChallenge> others = pendingChallenges.remove(target);
        if (others != null) {
            others.keySet().stream()
                .filter(other -> !other.equals(challenger))
                .forEach(other -> {
                    Map<String, Object> rejected = payload("CHALLENGE_REJECTED", other, target);
                    rejected.put("reason", "BUSY");
                    rejected.put("from", target);
                    rejected.put("message", "Người chơi " + target + " đã nhận lời mời khác.");
                    messagingTemplate.convertAndSendToUser(other, QUEUE, rejected);
                });
        }
        // Người vừa vào trận không còn gửi lời mời nào đang chờ được
        dropOutgoing(target);
        dropOutgoing(challenger);
    }

    /** Người được mời từ chối. */
    public synchronized void rejectChallenge(String challenger, String target) {
        removeOne(challenger, target);
        Map<String, Object> rejected = payload("CHALLENGE_REJECTED", challenger, target);
        rejected.put("reason", "DECLINED");
        rejected.put("from", target);
        rejected.put("message", "Người chơi " + target + " đã từ chối lời mời của bạn.");
        messagingTemplate.convertAndSendToUser(challenger, QUEUE, rejected);
    }

    /** Người mời huỷ lời mời đang chờ. */
    public synchronized void cancelChallenge(String challenger, String target) {
        if (!removeOne(challenger, target)) {
            return;
        }
        messagingTemplate.convertAndSendToUser(target, QUEUE, payload("CHALLENGE_CANCELLED", challenger, target));
        messagingTemplate.convertAndSendToUser(challenger, QUEUE, payload("CHALLENGE_CANCELLED", challenger, target));
    }

    /** Quét lời mời hết hạn mỗi giây và báo cho cả hai phía. */
    @Scheduled(fixedRate = 1000)
    public synchronized void expireAll() {
        LocalDateTime now = LocalDateTime.now();
        for (String target : new ArrayList<>(pendingChallenges.keySet())) {
            Map<String, PendingChallenge> incoming = pendingChallenges.get(target);
            if (incoming == null) {
                continue;
            }
            incoming.entrySet().removeIf(entry -> {
                PendingChallenge pending = entry.getValue();
                if (Duration.between(pending.getTimestamp(), now).getSeconds() < CHALLENGE_TIMEOUT_SECONDS) {
                    return false;
                }
                String challenger = pending.getChallengerUsername();
                log.info("[CHALLENGE] Expired {} -> {}", challenger, target);
                Map<String, Object> toChallenger = payload("CHALLENGE_REJECTED", challenger, target);
                toChallenger.put("reason", "EXPIRED");
                toChallenger.put("from", target);
                toChallenger.put("message", "Lời mời tới " + target + " đã hết hạn.");
                messagingTemplate.convertAndSendToUser(challenger, QUEUE, toChallenger);
                Map<String, Object> toTarget = payload("CHALLENGE_REJECTED", challenger, target);
                toTarget.put("reason", "EXPIRED");
                toTarget.put("from", challenger);
                toTarget.put("message", "Lời mời từ " + challenger + " đã hết hạn.");
                messagingTemplate.convertAndSendToUser(target, QUEUE, toTarget);
                return true;
            });
            if (incoming.isEmpty()) {
                pendingChallenges.remove(target);
            }
        }
    }

    private boolean removeOne(String challenger, String target) {
        Map<String, PendingChallenge> incoming = pendingChallenges.get(target);
        if (incoming == null) {
            return false;
        }
        boolean removed = incoming.remove(challenger) != null;
        if (incoming.isEmpty()) {
            pendingChallenges.remove(target);
        }
        return removed;
    }

    /** Huỷ mọi lời mời mà {@code challenger} đang gửi đi. */
    private void dropOutgoing(String challenger) {
        for (String target : new ArrayList<>(pendingChallenges.keySet())) {
            if (removeOne(challenger, target)) {
                messagingTemplate.convertAndSendToUser(target, QUEUE, payload("CHALLENGE_CANCELLED", challenger, target));
            }
        }
    }

    private Optional<String> findOutgoingTarget(String challenger) {
        for (Map.Entry<String, Map<String, PendingChallenge>> entry : pendingChallenges.entrySet()) {
            if (entry.getValue().containsKey(challenger)) {
                return Optional.of(entry.getKey());
            }
        }
        return Optional.empty();
    }

    private void sendError(String to, String target, String code, String message) {
        Map<String, Object> error = payload("CHALLENGE_ERROR", to, target);
        error.put("code", code);
        error.put("message", message);
        log.info("[CHALLENGE] Error {} for {} -> {}", code, to, target);
        messagingTemplate.convertAndSendToUser(to, QUEUE, error);
    }

    private Map<String, Object> payload(String type, String challenger, String target) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", type);
        message.put("challenger", challenger);
        message.put("target", target);
        message.put("timeoutMs", CHALLENGE_TIMEOUT_SECONDS * 1000);
        return message;
    }
}
