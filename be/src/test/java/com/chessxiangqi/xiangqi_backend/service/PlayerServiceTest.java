package com.chessxiangqi.xiangqi_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;

class PlayerServiceTest {

    @Test
    void staleSessionDisconnectDoesNotRemoveNewSession() {
        PlayerRepository repository = mock(PlayerRepository.class);
        Player player = new Player();
        player.setId("p1-id");
        player.setUsername("p1");
        when(repository.findByUsername("p1")).thenReturn(player);

        PlayerService service = new PlayerService();
        ReflectionTestUtils.setField(service, "playerRepository", repository);

        // Tải lại trang: phiên mới kết nối trước, phiên cũ đóng sau
        service.addOnlinePlayer("p1", "old-session");
        service.addOnlinePlayer("p1", "new-session");
        assertFalse(service.removeOnlinePlayerBySessionId("old-session"));
        assertEquals(1, service.getOnlinePlayers().size());

        assertTrue(service.removeOnlinePlayerBySessionId("new-session"));
        assertTrue(service.getOnlinePlayers().isEmpty());
    }
}
