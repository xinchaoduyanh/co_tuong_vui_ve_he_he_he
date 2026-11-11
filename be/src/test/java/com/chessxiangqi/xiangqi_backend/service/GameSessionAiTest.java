package com.chessxiangqi.xiangqi_backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.chessxiangqi.xiangqi_backend.model.GameSession;
import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.service.GameSessionService.GameActionException;
import com.chessxiangqi.xiangqi_backend.service.ai.EngineMoveService;
import com.chessxiangqi.xiangqi_backend.util.XiangqiNotation;
import com.chessxiangqi.xiangqi_backend.util.XiangqiRules;

/** Ván người - máy: người cầm đỏ (p1), máy là đen (da1). */
class GameSessionAiTest {

    private GameSessionService service;
    private MoveService moveService;
    private PlayerService playerService;
    private EngineMoveService engine;
    private Player human;
    private Player ai;

    @BeforeEach
    void setUp() {
        MatchService matchService = mock(MatchService.class);
        moveService = mock(MoveService.class);
        playerService = mock(PlayerService.class);
        engine = mock(EngineMoveService.class);

        service = new GameSessionService();
        ReflectionTestUtils.setField(service, "matchService", matchService);
        ReflectionTestUtils.setField(service, "moveService", moveService);
        ReflectionTestUtils.setField(service, "playerService", playerService);
        ReflectionTestUtils.setField(service, "playerMatchRepository", mock(PlayerMatchRepository.class));
        ReflectionTestUtils.setField(service, "playerMatchService", mock(PlayerMatchService.class));
        ReflectionTestUtils.setField(service, "engineMoveService", engine);
        ReflectionTestUtils.setField(service, "messagingTemplate", mock(SimpMessagingTemplate.class));

        human = new Player();
        human.setId("h1");
        human.setUsername("p1");
        ai = new Player();
        ai.setId("a1");
        ai.setUsername("da1");

        when(engine.isAvailable()).thenReturn(true);
        when(playerService.getPlayerByUsername("p1")).thenReturn(Optional.of(human));
        when(playerService.getPlayerByUsername("da1")).thenReturn(Optional.of(ai));
        when(playerService.getPlayerById("h1")).thenReturn(Optional.of(human));
        when(playerService.getPlayerById("a1")).thenReturn(Optional.of(ai));
        when(playerService.getOnlinePlayers()).thenReturn(List.of());
        when(matchService.createMatch(any())).thenAnswer(inv -> inv.getArgument(0));
        when(matchService.getMatchById(anyString())).thenAnswer(inv -> Optional.empty());
    }

    private GameSession startRedHuman() throws Exception {
        GameSession session = service.startAiGame("p1", 3, 'r');
        Match m = new Match();
        m.setId(session.getMatchId());
        m.setPlayer1(human);
        m.setPlayer2(ai);
        m.setAiLevel(3);
        MatchService matchService = (MatchService) ReflectionTestUtils.getField(service, "matchService");
        when(matchService.getMatchById(session.getMatchId())).thenReturn(Optional.of(m));
        Move initial = new Move();
        initial.setMatchId(session.getMatchId());
        initial.setTurnNumber(0);
        initial.setBoardState(XiangqiNotation.INITIAL_BOARD);
        initial.setNextTurn("r");
        when(moveService.getLatestMove(session.getMatchId())).thenReturn(initial);
        return session;
    }

    private void aiWillReply(int fx, int fy, int tx, int ty) throws Exception {
        when(engine.chooseMove(anyString(), anyList(), anyString(), anyChar(), anyInt()))
            .thenReturn(new XiangqiRules.Move(fx, fy, tx, ty));
    }

    private static void awaitTurn(GameSession s, char turn) throws InterruptedException {
        for (int i = 0; i < 100 && s.getTurn() != turn; i++) {
            Thread.sleep(50);
        }
        assertEquals(turn, s.getTurn());
    }

    @Test
    void humanMoveTriggersAiReply() throws Exception {
        GameSession s = startRedHuman();
        assertTrue(s.isAiGame());
        assertEquals('b', s.getAiSide());
        aiWillReply(0, 6, 0, 5);   // tốt đen tiến

        service.makeMove(s.getMatchId(), "p1", 0, 3, 0, 4);
        verify(engine, timeout(3000)).chooseMove(eq(XiangqiNotation.INITIAL_FEN), eq(List.of("a3a4")), anyString(), eq('b'), eq(3));
        awaitTurn(s, 'r');

        assertEquals(List.of("a3a4", "a6a5"), s.getMoveHistory());
        assertEquals(3, s.getNextTurnNumber());
    }

    @Test
    void aiGameDoesNotChangeElo() throws Exception {
        GameSession s = startRedHuman();
        service.surrender(s.getMatchId(), "p1");
        verify(playerService).applyMatchResult(human, 0, "LOSE");
        verify(playerService).applyMatchResult(ai, 0, "WIN");
    }

    @Test
    void undoRestoresPositionBeforeTheLastPairOfMoves() throws Exception {
        GameSession s = startRedHuman();
        aiWillReply(0, 6, 0, 5);
        service.makeMove(s.getMatchId(), "p1", 0, 3, 0, 4);
        awaitTurn(s, 'b');
        awaitTurn(s, 'r');

        service.undo(s.getMatchId(), "p1");

        assertEquals(XiangqiNotation.INITIAL_BOARD, s.getBoardState());
        assertEquals('r', s.getTurn());
        assertEquals(1, s.getNextTurnNumber());
        assertTrue(s.getMoveHistory().isEmpty());
        assertEquals(1, s.getUndosUsed());
        verify(moveService).deleteMovesAfter(s.getMatchId(), 0);
    }

    @Test
    void undoRightAfterHumanMoveDropsOnlyThatMoveAndCancelsAiReply() throws Exception {
        GameSession s = startRedHuman();
        // Engine "nghĩ" lâu: máy chưa kịp đi khi người bấm đi lại
        when(engine.chooseMove(anyString(), anyList(), anyString(), anyChar(), anyInt())).thenAnswer(inv -> {
            Thread.sleep(800);
            return new XiangqiRules.Move(0, 6, 0, 5);
        });
        service.makeMove(s.getMatchId(), "p1", 0, 3, 0, 4);
        assertEquals('b', s.getTurn());

        service.undo(s.getMatchId(), "p1");
        assertEquals('r', s.getTurn());
        assertEquals(XiangqiNotation.INITIAL_BOARD, s.getBoardState());

        Thread.sleep(1500);   // nước máy tính muộn không được áp vào thế mới
        assertEquals('r', s.getTurn());
        assertEquals(XiangqiNotation.INITIAL_BOARD, s.getBoardState());
        assertTrue(s.getMoveHistory().isEmpty());
    }

    @Test
    void undoWithNothingToUndoOrOutsideAiGameIsRejected() throws Exception {
        GameSession s = startRedHuman();
        GameActionException e = assertThrows(GameActionException.class, () -> service.undo(s.getMatchId(), "p1"));
        assertEquals("Chưa có nước nào để đi lại", e.getMessage());
        assertThrows(GameActionException.class, () -> service.undo(s.getMatchId(), "stranger"));
        assertFalse(s.getUndosUsed() > 0);
    }

    @Test
    void undoIsLimited() throws Exception {
        GameSession s = startRedHuman();
        aiWillReply(0, 6, 0, 5);
        for (int i = 0; i < GameSessionService.MAX_UNDOS; i++) {
            service.makeMove(s.getMatchId(), "p1", 0, 3, 0, 4);
            awaitTurn(s, 'b');
            awaitTurn(s, 'r');
            service.undo(s.getMatchId(), "p1");
        }
        service.makeMove(s.getMatchId(), "p1", 0, 3, 0, 4);
        awaitTurn(s, 'b');
        awaitTurn(s, 'r');
        GameActionException e = assertThrows(GameActionException.class, () -> service.undo(s.getMatchId(), "p1"));
        assertEquals("Bạn đã hết lượt đi lại", e.getMessage());
    }

    @Test
    void busyEngineIsRetried() throws Exception {
        ReflectionTestUtils.setField(service, "aiRetryDelayMs", 10L);
        GameSession s = startRedHuman();
        when(engine.chooseMove(anyString(), anyList(), anyString(), anyChar(), anyInt()))
            .thenThrow(new EngineMoveService.EngineBusyException())
            .thenReturn(new XiangqiRules.Move(0, 6, 0, 5));

        service.makeMove(s.getMatchId(), "p1", 0, 3, 0, 4);
        awaitTurn(s, 'r');

        assertEquals(List.of("a3a4", "a6a5"), s.getMoveHistory());
        verify(engine, times(2)).chooseMove(anyString(), anyList(), anyString(), anyChar(), anyInt());
    }

    @Test
    void brokenEngineFallsBackToALegalMoveInsteadOfStalling() throws Exception {
        ReflectionTestUtils.setField(service, "aiRetryDelayMs", 10L);
        GameSession s = startRedHuman();
        when(engine.chooseMove(anyString(), anyList(), anyString(), anyChar(), anyInt()))
            .thenThrow(new IllegalStateException("engine chết"));

        service.makeMove(s.getMatchId(), "p1", 0, 3, 0, 4);
        awaitTurn(s, 'r');

        assertEquals(2, s.getMoveHistory().size());
        assertFalse(s.isEnded());
    }

    @Test
    void sessionReloadedOnAiTurnLetsTheAiMove() throws Exception {
        String board = XiangqiRules.apply(XiangqiNotation.INITIAL_BOARD, new XiangqiRules.Move(0, 3, 0, 4));
        Match m = new Match();
        m.setId("reloaded");
        m.setPlayer1(human);
        m.setPlayer2(ai);
        m.setAiLevel(2);
        Move latest = new Move();
        latest.setMatchId("reloaded");
        latest.setTurnNumber(1);
        latest.setBoardState(board);
        latest.setNextTurn("b");
        latest.setMoveDescription("r 0,3 -> 0,4");
        MatchService matchService = (MatchService) ReflectionTestUtils.getField(service, "matchService");
        when(matchService.getMatchById("reloaded")).thenReturn(Optional.of(m));
        when(moveService.getLatestMove("reloaded")).thenReturn(latest);
        when(moveService.getMovesByMatchId("reloaded")).thenReturn(List.of(latest));
        aiWillReply(0, 6, 0, 5);

        GameSession s = service.getSession("reloaded").orElseThrow();
        awaitTurn(s, 'r');

        verify(engine).chooseMove(eq(XiangqiNotation.INITIAL_FEN), eq(List.of("a3a4")), eq(board), eq('b'), eq(2));
        assertEquals(List.of("a3a4", "a6a5"), s.getMoveHistory());
    }

    @Test
    void invalidLevelOrSideIsRejected() {
        assertThrows(GameActionException.class, () -> service.startAiGame("p1", 0, 'r'));
        assertThrows(GameActionException.class, () -> service.startAiGame("p1", 6, 'r'));
        assertThrows(GameActionException.class, () -> service.startAiGame("p1", 3, 'x'));
    }
}
