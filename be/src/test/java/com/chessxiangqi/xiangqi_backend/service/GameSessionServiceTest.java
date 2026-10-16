package com.chessxiangqi.xiangqi_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.LongSupplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.chessxiangqi.xiangqi_backend.model.GameSession;
import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.service.GameSessionService.GameActionException;

class GameSessionServiceTest {

    private static final String INITIAL_BOARD =
        "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR";

    private GameSessionService service;
    private MatchService matchService;
    private MoveService moveService;
    private PlayerService playerService;
    private PlayerMatchRepository playerMatchRepository;
    private Player red;
    private Player black;
    private Match match;
    // Đồng hồ giả lập (ms)
    private long nowMs = 1_000_000L;

    @BeforeEach
    void setUp() {
        matchService = mock(MatchService.class);
        moveService = mock(MoveService.class);
        playerService = mock(PlayerService.class);
        playerMatchRepository = mock(PlayerMatchRepository.class);
        SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);

        service = new GameSessionService();
        ReflectionTestUtils.setField(service, "matchService", matchService);
        ReflectionTestUtils.setField(service, "moveService", moveService);
        ReflectionTestUtils.setField(service, "playerService", playerService);
        ReflectionTestUtils.setField(service, "playerMatchRepository", playerMatchRepository);
        ReflectionTestUtils.setField(service, "messagingTemplate", template);
        ReflectionTestUtils.setField(service, "clock", (LongSupplier) () -> nowMs);

        red = new Player();
        red.setId("r1");
        red.setUsername("p1");
        black = new Player();
        black.setId("b1");
        black.setUsername("p2");

        match = new Match();
        match.setId("m1");
        match.setPlayer1(red);
        match.setPlayer2(black);

        when(matchService.getMatchById("m1")).thenReturn(Optional.of(match));
        when(playerService.getPlayerById("r1")).thenReturn(Optional.of(red));
        when(playerService.getPlayerById("b1")).thenReturn(Optional.of(black));
        when(playerMatchRepository.findByMatchId("m1")).thenReturn(List.of());
        when(playerService.getOnlinePlayers()).thenReturn(List.of());
        when(playerService.getPlayerByUsername("p1")).thenReturn(Optional.of(red));
        when(playerService.getPlayerByUsername("p2")).thenReturn(Optional.of(black));
        when(matchService.findActiveByPlayerId(anyString(), any())).thenReturn(List.of(match));
    }

    /** Nạp trận với bàn cờ cho trước và bên đi đầu tiên. */
    private void startWith(String board, String turn) {
        Move latest = new Move();
        latest.setMatchId("m1");
        latest.setBoardState(board);
        latest.setNextTurn(turn);
        latest.setTurnNumber(0);
        when(moveService.getLatestMove("m1")).thenReturn(latest);
        // Nạp trận ngay để đồng hồ bắt đầu tại thời điểm này
        service.getSession("m1");
    }

    /** Bàn cờ trống với các quân cho trước, mỗi quân dạng "<ký tự><x><y>". */
    private static String board(String... pieces) {
        char[] cells = ".".repeat(90).toCharArray();
        for (String p : pieces) {
            cells[(p.charAt(2) - '0') * 9 + (p.charAt(1) - '0')] = p.charAt(0);
        }
        return new String(cells);
    }

    @Test
    void moveOutOfTurnIsRejected() {
        startWith(INITIAL_BOARD, "r");
        GameActionException e = assertThrows(GameActionException.class,
            () -> service.makeMove("m1", "p2", 1, 7, 1, 5));
        assertEquals("Chưa đến lượt bạn", e.getMessage());
    }

    @Test
    void moveOfOpponentPieceIsRejected() {
        startWith(INITIAL_BOARD, "r");
        GameActionException e = assertThrows(GameActionException.class,
            () -> service.makeMove("m1", "p1", 0, 9, 0, 7));
        assertEquals("Ô bạn chọn không có quân của bạn", e.getMessage());
    }

    @Test
    void illegalGeometryIsRejected() {
        startWith(INITIAL_BOARD, "r");
        // Xe đỏ (0,0) bị tốt (0,3) chặn, không thể sang (0,5)
        GameActionException e = assertThrows(GameActionException.class,
            () -> service.makeMove("m1", "p1", 0, 0, 0, 5));
        assertEquals("Nước đi không hợp lệ với luật đi của quân cờ", e.getMessage());
    }

    @Test
    void outsiderCannotMove() {
        startWith(INITIAL_BOARD, "r");
        assertThrows(GameActionException.class, () -> service.makeMove("m1", "stranger", 0, 3, 0, 4));
    }

    @Test
    void checkmateEndsGameAndRedWins() {
        // Đen (5,9) bị xe (0,5) chiếu khi lên (0,9); (4,9) và (5,8) đều bị xe (4,8) kiểm soát
        startWith(board("k30", "K59", "r48", "r05"), "r");

        service.makeMove("m1", "p1", 0, 5, 0, 9);

        assertTrue(service.getSession("m1").orElseThrow().isEnded());
        assertEquals("CHECKMATE", match.getResult());
        assertEquals(red, match.getWinner());
        ArgumentCaptor<String> results = ArgumentCaptor.forClass(String.class);
        verify(playerService, times(2)).applyMatchResult(any(), anyInt(), results.capture());
        assertEquals(List.of("WIN", "LOSE"), results.getAllValues());
    }

    @Test
    void finishGameIsIdempotent() {
        startWith(INITIAL_BOARD, "r");
        GameSession session = service.getSession("m1").orElseThrow();

        service.finishGame(session, "SURRENDER", 'r');
        service.finishGame(session, "SURRENDER", 'r');

        // Chỉ cập nhật thống kê một lần cho mỗi người chơi
        verify(playerService, times(2)).applyMatchResult(any(), anyInt(), anyString());
    }

    @Test
    void eloChangeIsSymmetric() {
        startWith(INITIAL_BOARD, "r");
        GameSession session = service.getSession("m1").orElseThrow();
        // Đỏ thắng: người thắng và người thua nhận biến thiên Elo đối nhau
        service.finishGame(session, "SURRENDER", 'b');

        ArgumentCaptor<Integer> changes = ArgumentCaptor.forClass(Integer.class);
        verify(playerService, times(2)).applyMatchResult(any(), changes.capture(), anyString());
        int sum = changes.getAllValues().stream().mapToInt(Integer::intValue).sum();
        assertEquals(0, sum);
    }

    @Test
    void eloDeltaFavoursUpsets() {
        assertEquals(20, GameSessionService.eloDelta(1500, 1500));
        // Người yếu thắng người mạnh nhận nhiều điểm hơn người mạnh thắng người yếu
        assertTrue(GameSessionService.eloDelta(1200, 1800) > GameSessionService.eloDelta(1800, 1200));
    }

    @Test
    void clockDeductsOnlyMoverTime() {
        startWith(INITIAL_BOARD, "r");
        nowMs += 30_000;
        service.makeMove("m1", "p1", 0, 3, 0, 4);
        GameSession session = service.getSession("m1").orElseThrow();
        assertEquals(570_000, session.getRedTimeMs());
        assertEquals(600_000, session.getBlackTimeMs());

        nowMs += 10_000;
        service.makeMove("m1", "p2", 0, 6, 0, 5);
        assertEquals(570_000, session.getRedTimeMs());
        assertEquals(590_000, session.getBlackTimeMs());
    }

    @Test
    void moveAfterTimeLimitLosesOnTheSpot() {
        startWith(INITIAL_BOARD, "r");
        nowMs += GameSessionService.TURN_LIMIT_MS + 1;
        service.makeMove("m1", "p1", 0, 3, 0, 4);
        assertEquals("TIMEOUT", match.getResult());
        assertEquals(black, match.getWinner());
    }

    @Test
    void checkTimeoutsEndsExpiredGame() {
        startWith(INITIAL_BOARD, "r");
        nowMs += GameSessionService.TURN_LIMIT_MS;
        service.checkTimeouts();
        assertEquals("TIMEOUT", match.getResult());
        assertEquals(black, match.getWinner());
    }

    @Test
    void disconnectOverGraceAbandonsMatch() {
        startWith(INITIAL_BOARD, "r");
        service.onPlayerDisconnected("p1");
        nowMs += GameSessionService.DISCONNECT_GRACE_MS + 1;
        service.checkTimeouts();
        assertEquals("ABANDON", match.getResult());
        assertEquals(black, match.getWinner());
    }

    @Test
    void reconnectWithinGraceKeepsMatch() {
        startWith(INITIAL_BOARD, "r");
        service.onPlayerDisconnected("p1");
        nowMs += 30_000;
        service.onPlayerConnected("p1");
        nowMs += GameSessionService.DISCONNECT_GRACE_MS;
        service.checkTimeouts();
        assertFalse(service.getSession("m1").orElseThrow().isEnded());
        assertNull(match.getResult());
        verify(playerService).updatePlayerStatus("p1", PlayerStatus.IN_GAME);
    }

    @Test
    void snapshotDescribesCurrentState() {
        startWith(INITIAL_BOARD, "r");
        Map<String, Object> snapshot = service.snapshot("m1").orElseThrow();
        assertEquals("ACTIVE", snapshot.get("status"));
        assertEquals("r", snapshot.get("turn"));
        assertEquals(INITIAL_BOARD, snapshot.get("boardState"));
        assertEquals(GameSessionService.TURN_LIMIT_MS, snapshot.get("redTimeMs"));
        assertNotNull(((Map<?, ?>) snapshot.get("players")).get("red"));
    }

    @Test
    void acceptedDrawRecordsDrawForBothPlayersWithoutEloChange() {
        startWith(INITIAL_BOARD, "r");
        service.acceptDraw("m1", "p2");

        assertEquals("DRAW_AGREED", match.getResult());
        assertNull(match.getWinner());
        ArgumentCaptor<Integer> changes = ArgumentCaptor.forClass(Integer.class);
        ArgumentCaptor<String> results = ArgumentCaptor.forClass(String.class);
        verify(playerService, times(2)).applyMatchResult(any(), changes.capture(), results.capture());
        assertEquals(List.of("DRAW", "DRAW"), results.getAllValues());
        assertEquals(List.of(0, 0), changes.getAllValues());
    }

    @Test
    void surrenderGivesWinToOpponent() {
        startWith(INITIAL_BOARD, "r");
        service.surrender("m1", "p1");

        assertEquals("SURRENDER", match.getResult());
        assertEquals(black, match.getWinner());
    }
}
