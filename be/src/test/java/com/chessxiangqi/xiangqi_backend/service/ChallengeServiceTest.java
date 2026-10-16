package com.chessxiangqi.xiangqi_backend.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.chessxiangqi.xiangqi_backend.model.PendingChallenge;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;

class ChallengeServiceTest {

    private static final String QUEUE = "/queue/challenge";

    private ChallengeService service;
    private PlayerService playerService;
    private SimpMessagingTemplate template;

    @BeforeEach
    void setUp() {
        playerService = mock(PlayerService.class);
        template = mock(SimpMessagingTemplate.class);
        service = new ChallengeService();
        ReflectionTestUtils.setField(service, "playerService", playerService);
        ReflectionTestUtils.setField(service, "messagingTemplate", template);
        when(playerService.statusOf("alice")).thenReturn(Optional.of(PlayerStatus.ONLINE));
    }

    private static boolean hasField(Object message, String key, Object value) {
        return message instanceof Map<?, ?> map && value.equals(map.get(key));
    }

    @Test
    void offlineTargetGetsCodedError() {
        when(playerService.statusOf("bob")).thenReturn(Optional.empty());

        service.sendChallenge("alice", "bob");

        verify(template).convertAndSendToUser(eq("alice"), eq(QUEUE),
            argThat(m -> hasField(m, "type", "CHALLENGE_ERROR") && hasField(m, "code", "TARGET_OFFLINE")));
        assertFalse(service.isPending("alice", "bob"));
    }

    @Test
    void busyTargetGetsCodedError() {
        when(playerService.statusOf("bob")).thenReturn(Optional.of(PlayerStatus.IN_GAME));

        service.sendChallenge("alice", "bob");

        verify(template).convertAndSendToUser(eq("alice"), eq(QUEUE),
            argThat(m -> hasField(m, "code", "TARGET_BUSY")));
    }

    @Test
    void validChallengeNotifiesBothSides() {
        when(playerService.statusOf("bob")).thenReturn(Optional.of(PlayerStatus.ONLINE));

        service.sendChallenge("alice", "bob");

        verify(template).convertAndSendToUser(eq("bob"), eq(QUEUE),
            argThat(m -> hasField(m, "type", "CHALLENGE_RECEIVED")));
        verify(template).convertAndSendToUser(eq("alice"), eq(QUEUE),
            argThat(m -> hasField(m, "type", "CHALLENGE_SENT")));
        assertTrue(service.isPending("alice", "bob"));
    }

    @Test
    void expiredChallengeNotifiesBothSidesWithReason() {
        when(playerService.statusOf("bob")).thenReturn(Optional.of(PlayerStatus.ONLINE));
        service.sendChallenge("alice", "bob");

        // Đẩy mốc tạo lời mời về quá khứ để giả lập đã hết 8 giây
        Map<String, Map<String, PendingChallenge>> pending =
            (Map<String, Map<String, PendingChallenge>>) ReflectionTestUtils.getField(service, "pendingChallenges");
        pending.get("bob").get("alice").setTimestamp(LocalDateTime.now().minusSeconds(9));

        service.expireAll();

        verify(template).convertAndSendToUser(eq("alice"), eq(QUEUE),
            argThat(m -> hasField(m, "type", "CHALLENGE_REJECTED") && hasField(m, "reason", "EXPIRED")));
        verify(template).convertAndSendToUser(eq("bob"), eq(QUEUE),
            argThat(m -> hasField(m, "type", "CHALLENGE_REJECTED") && hasField(m, "reason", "EXPIRED")));
        assertFalse(service.isPending("alice", "bob"));
    }

    @Test
    void cancelRemovesPendingAndNotifiesTarget() {
        when(playerService.statusOf("bob")).thenReturn(Optional.of(PlayerStatus.ONLINE));
        service.sendChallenge("alice", "bob");
        service.cancelChallenge("alice", "bob");

        assertFalse(service.isPending("alice", "bob"));
        verify(template, never()).convertAndSendToUser(eq("bob"), eq(QUEUE),
            argThat(m -> hasField(m, "type", "CHALLENGE_REJECTED")));
        verify(template).convertAndSendToUser(eq("bob"), eq(QUEUE),
            argThat(m -> hasField(m, "type", "CHALLENGE_CANCELLED")));
    }
}
