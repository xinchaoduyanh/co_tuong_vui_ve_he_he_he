package com.chessxiangqi.xiangqi_backend.service;

import java.time.Duration;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.dto.PlayerPublicDto;
import com.chessxiangqi.xiangqi_backend.model.GameSession;
import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.util.XiangqiRules;

import lombok.extern.slf4j.Slf4j;

/**
 * Quản lý trận người-người đang diễn ra. Server là nguồn sự thật:
 * kiểm tra lượt, người chơi và luật cờ; mọi kết thúc trận đi qua {@link #finishGame}.
 */
@Slf4j
@Service
public class GameSessionService {

    private static final int BASE_ELO_POINT = 20;

    /** Mỗi bên có 10 phút cho cả ván. */
    public static final long TURN_LIMIT_MS = 600_000L;

    /** Mất kết nối quá 60 giây thì bị xử thua (ABANDON). */
    public static final long DISCONNECT_GRACE_MS = 60_000L;

    /**
     * Chỉ coi là trận đang chơi nếu được tạo trong khoảng thời gian này (tránh trận bỏ dở cũ).
     * Mỗi bên có 10 phút đồng hồ và chỉ bên đang đi bị trừ giờ, nên một ván không quá khoảng 20 phút.
     */
    private static final Duration ACTIVE_WINDOW = Duration.ofMinutes(30);

    @Autowired
    private MatchService matchService;

    @Autowired
    private MoveService moveService;

    @Autowired
    private PlayerService playerService;

    @Autowired
    private PlayerMatchRepository playerMatchRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Trận đang chơi, theo matchId
    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();

    // Nguồn thời gian; test có thể thay để giả lập đồng hồ
    private LongSupplier clock = System::currentTimeMillis;

    /** Lỗi do người chơi gây ra; thông điệp được gửi nguyên văn cho họ. */
    public static class GameActionException extends RuntimeException {
        public GameActionException(String message) {
            super(message);
        }
    }

    /** Lấy trạng thái trận; nếu chưa có trong bộ nhớ thì nạp lại từ DB. */
    public Optional<GameSession> getSession(String matchId) {
        GameSession cached = sessions.get(matchId);
        if (cached != null) {
            return Optional.of(cached);
        }
        Optional<Match> matchOpt = matchService.getMatchById(matchId);
        if (matchOpt.isEmpty()) {
            return Optional.empty();
        }
        Match match = matchOpt.get();
        Move latest;
        try {
            latest = moveService.getLatestMove(matchId);
        } catch (RuntimeException e) {
            return Optional.empty();
        }

        GameSession session = new GameSession(
            match.getId(),
            match.getPlayer1().getId(), match.getPlayer1().getUsername(),
            match.getPlayer2().getId(), match.getPlayer2().getUsername()
        );
        session.setBoardState(latest.getBoardState());
        session.setTurn(latest.getNextTurn().charAt(0));
        session.setNextTurnNumber(latest.getTurnNumber() + 1);
        session.setCheck(XiangqiRules.isInCheck(latest.getBoardState(), session.getTurn()));
        session.setRedTimeMs(latest.getRedTimeMs() != null ? latest.getRedTimeMs() : TURN_LIMIT_MS);
        session.setBlackTimeMs(latest.getBlackTimeMs() != null ? latest.getBlackTimeMs() : TURN_LIMIT_MS);
        session.setLastTickAt(clock.getAsLong());
        session.setEnded(match.getEndDate() != null);
        session.setEndReason(match.getResult());
        session.setLastMoveDescription(latest.getMoveDescription());
        if (match.getWinner() != null) {
            session.setWinnerColor(match.getWinner().getId().equals(match.getPlayer1().getId()) ? 'r' : 'b');
        }
        sessions.putIfAbsent(matchId, session);
        return Optional.of(sessions.get(matchId));
    }

    /** Xử lý nước đi của {@code username} trong trận {@code matchId}. Ném {@link GameActionException} nếu sai. */
    public void makeMove(String matchId, String username, int fromX, int fromY, int toX, int toY) {
        GameSession session = getSession(matchId)
            .orElseThrow(() -> new GameActionException("Không tìm thấy trận đấu"));

        synchronized (session) {
            if (session.isEnded()) {
                throw new GameActionException("Trận đấu đã kết thúc");
            }
            char side = sideOf(session, username);
            if (side != session.getTurn()) {
                throw new GameActionException("Chưa đến lượt bạn");
            }
            // Hết giờ trước khi kịp đi: thua ngay, nước đi không được áp dụng
            if (settleClock(session, clock.getAsLong())) {
                finishGame(session, "TIMEOUT", XiangqiRules.opponent(side));
                return;
            }
            if (!inBoard(fromX, fromY) || !inBoard(toX, toY)) {
                throw new GameActionException("Nước đi không hợp lệ");
            }

            String board = session.getBoardState();
            char piece = board.charAt(fromY * XiangqiRules.WIDTH + fromX);
            if (piece == '.' || XiangqiRules.owner(piece) != side) {
                throw new GameActionException("Ô bạn chọn không có quân của bạn");
            }

            XiangqiRules.Move move = new XiangqiRules.Move(fromX, fromY, toX, toY);
            if (!XiangqiRules.legalMoves(board, side).contains(move)) {
                throw new GameActionException(illegalMoveReason(board, move, side));
            }

            String next = XiangqiRules.apply(board, move);
            char nextSide = XiangqiRules.opponent(side);
            XiangqiRules.Status status = XiangqiRules.evaluate(next, nextSide);
            String description = String.format("%c %d,%d -> %d,%d", piece, fromX, fromY, toX, toY);

            Move entity = new Move();
            entity.setMatchId(matchId);
            entity.setTurnNumber(session.getNextTurnNumber());
            entity.setBoardState(next);
            entity.setNextTurn(String.valueOf(nextSide));
            entity.setMoveDescription(description);
            entity.setCheck(status == XiangqiRules.Status.CHECK || status == XiangqiRules.Status.CHECKMATE);
            entity.setCheckmate(status == XiangqiRules.Status.CHECKMATE);
            entity.setRedTimeMs(session.getRedTimeMs());
            entity.setBlackTimeMs(session.getBlackTimeMs());
            moveService.saveMove(entity);

            session.setBoardState(next);
            session.setTurn(nextSide);
            session.setNextTurnNumber(session.getNextTurnNumber() + 1);
            session.setCheck(entity.isCheck());
            session.setLastMoveDescription(description);

            Map<String, Object> payload = new HashMap<>();
            payload.put("boardState", next);
            payload.put("moveDescription", description);
            payload.put("fromX", fromX);
            payload.put("fromY", fromY);
            payload.put("toX", toX);
            payload.put("toY", toY);
            payload.put("pieceType", String.valueOf(Character.toUpperCase(piece)));
            payload.put("color", String.valueOf(side));
            payload.put("playerId", username.equals(session.getRedUsername()) ? session.getRedPlayerId() : session.getBlackPlayerId());
            payload.put("nextTurn", String.valueOf(nextSide));
            payload.put("status", status.name());
            payload.put("isCheck", entity.isCheck());
            payload.put("isCheckmate", status == XiangqiRules.Status.CHECKMATE);
            payload.put("redCheck", XiangqiRules.isInCheck(next, XiangqiRules.RED));
            payload.put("blackCheck", XiangqiRules.isInCheck(next, XiangqiRules.BLACK));
            payload.put("redTimeMs", session.getRedTimeMs());
            payload.put("blackTimeMs", session.getBlackTimeMs());
            messagingTemplate.convertAndSend("/topic/match." + matchId + ".board", payload);

            if (status == XiangqiRules.Status.CHECKMATE || status == XiangqiRules.Status.STALEMATE) {
                // Bên đến lượt không còn nước đi: thua (kể cả hết nước khi không bị chiếu)
                finishGame(session, status.name(), side);
            }
        }
    }

    /** Đầu hàng: {@code username} thua. */
    public void surrender(String matchId, String username) {
        GameSession session = getSession(matchId)
            .orElseThrow(() -> new GameActionException("Không tìm thấy trận đấu"));
        synchronized (session) {
            if (session.isEnded()) {
                return;
            }
            char side = sideOf(session, username);
            finishGame(session, "SURRENDER", XiangqiRules.opponent(side));
        }
    }

    /** Chấp nhận cầu hòa: kết thúc hòa. */
    public void acceptDraw(String matchId, String username) {
        GameSession session = getSession(matchId)
            .orElseThrow(() -> new GameActionException("Không tìm thấy trận đấu"));
        synchronized (session) {
            if (session.isEnded()) {
                return;
            }
            sideOf(session, username);
            finishGame(session, "DRAW_AGREED", null);
        }
    }

    /** Gửi lỗi nước đi riêng cho người chơi. */
    public void sendError(String username, String message) {
        Map<String, String> error = new HashMap<>();
        error.put("type", "ERROR");
        error.put("message", message);
        messagingTemplate.convertAndSendToUser(username, "/queue/game.error", error);
    }

    /**
     * Kết thúc trận. Idempotent: gọi lần hai thì bỏ qua, nên Elo không bị cộng hai lần.
     * @param winnerColor 'r' | 'b', hoặc null nếu hòa
     */
    public void finishGame(GameSession session, String reason, Character winnerColor) {
        synchronized (session) {
            if (session.isEnded()) {
                return;
            }
            session.setEnded(true);
            session.setEndReason(reason);
            session.setWinnerColor(winnerColor);
        }

        Player red = playerService.getPlayerById(session.getRedPlayerId()).orElseThrow();
        Player black = playerService.getPlayerById(session.getBlackPlayerId()).orElseThrow();

        int redDelta = 0;
        int blackDelta = 0;
        String redResult = "DRAW";
        String blackResult = "DRAW";
        if (winnerColor != null) {
            boolean redWins = winnerColor == 'r';
            Player winner = redWins ? red : black;
            Player loser = redWins ? black : red;
            int delta = eloDelta(winner.getElo(), loser.getElo());
            redDelta = redWins ? delta : -delta;
            blackDelta = redWins ? -delta : delta;
            redResult = redWins ? "WIN" : "LOSE";
            blackResult = redWins ? "LOSE" : "WIN";
        }

        playerService.applyMatchResult(red, redDelta, redResult);
        playerService.applyMatchResult(black, blackDelta, blackResult);

        for (PlayerMatch pm : playerMatchRepository.findByMatchId(session.getMatchId())) {
            if (pm.getPlayerId().equals(red.getId())) {
                pm.setResult(redResult);
                pm.setEloChange(redDelta);
            } else {
                pm.setResult(blackResult);
                pm.setEloChange(blackDelta);
            }
            playerMatchRepository.save(pm);
        }

        Match match = matchService.getMatchById(session.getMatchId())
            .orElseThrow(() -> new IllegalStateException("Match not found: " + session.getMatchId()));
        match.setEndDate(new Date());
        match.setResult(reason);
        match.setWinner(winnerColor == null ? null : (winnerColor == 'r' ? red : black));
        matchService.updateMatch(match);

        playerService.updatePlayerStatus(session.getRedUsername(), PlayerStatus.ONLINE);
        playerService.updatePlayerStatus(session.getBlackUsername(), PlayerStatus.ONLINE);

        Player redAfter = playerService.getPlayerById(red.getId()).orElse(red);
        Player blackAfter = playerService.getPlayerById(black.getId()).orElse(black);
        Map<String, Object> endGame = new HashMap<>();
        endGame.put("type", "END_GAME");
        endGame.put("reason", reason);
        endGame.put("winner", winnerColor == null ? "DRAW" : (winnerColor == 'r' ? "red" : "black"));
        endGame.put("player1", PlayerPublicDto.from(redAfter));
        endGame.put("player2", PlayerPublicDto.from(blackAfter));
        endGame.put("player1EloChange", redDelta);
        endGame.put("player2EloChange", blackDelta);
        messagingTemplate.convertAndSend("/topic/match." + session.getMatchId() + ".end", endGame);
        messagingTemplate.convertAndSend("/topic/users.online", playerService.getOnlinePlayers());

        log.info("[GAME] Match {} ended: reason={}, winner={}", session.getMatchId(), reason, winnerColor);
    }

    /** Quét các trận đang chơi mỗi giây: bên đang đến lượt hết giờ thì thua. */
    @Scheduled(fixedRate = 1000)
    public void checkTimeouts() {
        long now = clock.getAsLong();
        for (GameSession session : sessions.values()) {
            synchronized (session) {
                if (session.isEnded()) {
                    continue;
                }
                char side = session.getTurn();
                if (remainingMs(session, now) <= 0) {
                    settleClock(session, now);
                    finishGame(session, "TIMEOUT", XiangqiRules.opponent(side));
                    continue;
                }
                // Bên nào mất kết nối quá 60 giây thì thua; đồng hồ vẫn chạy khi mất kết nối
                Character gone = disconnectedOverGrace(session, now);
                if (gone != null) {
                    finishGame(session, "ABANDON", XiangqiRules.opponent(gone));
                }
            }
        }
    }

    /** Gửi đồng bộ đồng hồ mỗi 5 giây cho các trận đang chơi. Client chỉ hiển thị, không quyết định thua. */
    @Scheduled(fixedRate = 5000)
    public void broadcastClocks() {
        long now = clock.getAsLong();
        for (GameSession session : sessions.values()) {
            synchronized (session) {
                if (session.isEnded()) {
                    continue;
                }
                Map<String, Object> payload = new HashMap<>();
                payload.put("turn", String.valueOf(session.getTurn()));
                payload.put("redTimeMs", displayedMs(session, 'r', now));
                payload.put("blackTimeMs", displayedMs(session, 'b', now));
                messagingTemplate.convertAndSend("/topic/match." + session.getMatchId() + ".clock", payload);
            }
        }
    }

    /** Trừ thời gian đã dùng của bên đang đến lượt, đặt lại mốc. Trả về true nếu bên đó đã hết giờ. */
    private boolean settleClock(GameSession session, long now) {
        long elapsed = now - session.getLastTickAt();
        if (session.getTurn() == 'r') {
            session.setRedTimeMs(Math.max(0, session.getRedTimeMs() - elapsed));
        } else {
            session.setBlackTimeMs(Math.max(0, session.getBlackTimeMs() - elapsed));
        }
        session.setLastTickAt(now);
        return remainingMs(session, now) <= 0;
    }

    /** Thời gian còn lại của bên đang đến lượt tại thời điểm {@code now}, không thay đổi trạng thái. */
    private long remainingMs(GameSession session, long now) {
        return displayedMs(session, session.getTurn(), now);
    }

    private long displayedMs(GameSession session, char side, long now) {
        long base = side == 'r' ? session.getRedTimeMs() : session.getBlackTimeMs();
        if (session.isEnded() || session.getTurn() != side) {
            return base;
        }
        return base - (now - session.getLastTickAt());
    }

    /** Biến thiên Elo đối xứng: người thắng được +delta, người thua -delta. */
    static int eloDelta(int winnerElo, int loserElo) {
        int low = Math.max(1, Math.min(winnerElo, loserElo));
        int high = Math.max(winnerElo, loserElo);
        double ratio = (double) high / low;
        return winnerElo < loserElo
            ? (int) Math.round(BASE_ELO_POINT * ratio)
            : (int) Math.round(BASE_ELO_POINT / ratio);
    }

    /** Trạng thái trận để client vào lại: bàn cờ, lượt, đồng hồ, hai người chơi. */
    public Optional<Map<String, Object>> snapshot(String matchId) {
        return getSession(matchId).map(this::snapshot);
    }

    public Map<String, Object> snapshot(GameSession session) {
        long now = clock.getAsLong();
        Map<String, Object> data = new HashMap<>();
        data.put("matchId", session.getMatchId());
        data.put("status", session.isEnded() ? "ENDED" : "ACTIVE");
        data.put("endReason", session.getEndReason());
        if (session.getWinnerColor() == null) {
            data.put("winner", session.isEnded() ? "DRAW" : null);
        } else {
            data.put("winner", session.getWinnerColor() == 'r' ? "red" : "black");
        }
        Map<String, Object> players = new HashMap<>();
        players.put("red", playerDto(session.getRedPlayerId()));
        players.put("black", playerDto(session.getBlackPlayerId()));
        data.put("players", players);
        data.put("boardState", session.getBoardState());
        data.put("turn", String.valueOf(session.getTurn()));
        data.put("check", session.isCheck());
        data.put("moveDescription", session.getLastMoveDescription());
        data.put("redTimeMs", displayedMs(session, 'r', now));
        data.put("blackTimeMs", displayedMs(session, 'b', now));
        data.put("serverTime", now);
        Map<String, Boolean> disconnected = new HashMap<>();
        disconnected.put("red", session.getRedDisconnectedAt() != null);
        disconnected.put("black", session.getBlackDisconnectedAt() != null);
        data.put("disconnected", disconnected);
        return data;
    }

    private PlayerPublicDto playerDto(String playerId) {
        return playerService.getPlayerById(playerId).map(PlayerPublicDto::from).orElse(null);
    }

    /** Trận người-người đang chơi của người chơi (nếu có), nạp từ bộ nhớ hoặc DB. */
    public Optional<GameSession> findActiveSessionByPlayerId(String playerId) {
        Date since = new Date(System.currentTimeMillis() - ACTIVE_WINDOW.toMillis());
        return matchService.findActiveByPlayerId(playerId, since).stream()
            .findFirst()
            .flatMap(match -> getSession(match.getId()));
    }

    /** Người chơi kết nối (hoặc kết nối lại): đặt trạng thái đang chơi nếu còn trận. */
    public void onPlayerConnected(String username) {
        findActiveSession(username).ifPresent(session -> {
            synchronized (session) {
                if (session.isEnded()) {
                    return;
                }
                char side = sideOf(session, username);
                playerService.updatePlayerStatus(username, PlayerStatus.IN_GAME);
                if (disconnectedAt(session, side) != null) {
                    setDisconnectedAt(session, side, null);
                    broadcastPresence(session, side, "RECONNECTED", 0);
                }
            }
        });
    }

    /** Người chơi mất kết nối giữa trận: báo đối thủ, bắt đầu đếm 60 giây. */
    public void onPlayerDisconnected(String username) {
        findActiveSession(username).ifPresent(session -> {
            synchronized (session) {
                if (session.isEnded()) {
                    return;
                }
                char side = sideOf(session, username);
                if (disconnectedAt(session, side) == null) {
                    long now = clock.getAsLong();
                    setDisconnectedAt(session, side, now);
                    broadcastPresence(session, side, "DISCONNECTED", now + DISCONNECT_GRACE_MS);
                }
            }
        });
    }

    private Optional<GameSession> findActiveSession(String username) {
        return playerService.getPlayerByUsername(username)
            .flatMap(player -> findActiveSessionByPlayerId(player.getId()));
    }

    /** Bên mất kết nối quá {@link #DISCONNECT_GRACE_MS}, hoặc null nếu không có bên nào. */
    private Character disconnectedOverGrace(GameSession session, long now) {
        for (char side : new char[] {'r', 'b'}) {
            Long since = disconnectedAt(session, side);
            if (since != null && now - since > DISCONNECT_GRACE_MS) {
                return side;
            }
        }
        return null;
    }

    private Long disconnectedAt(GameSession session, char side) {
        return side == 'r' ? session.getRedDisconnectedAt() : session.getBlackDisconnectedAt();
    }

    private void setDisconnectedAt(GameSession session, char side, Long value) {
        if (side == 'r') {
            session.setRedDisconnectedAt(value);
        } else {
            session.setBlackDisconnectedAt(value);
        }
    }

    private void broadcastPresence(GameSession session, char side, String status, long deadline) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "PRESENCE");
        payload.put("color", String.valueOf(side));
        payload.put("username", side == 'r' ? session.getRedUsername() : session.getBlackUsername());
        payload.put("status", status);
        payload.put("deadline", deadline);
        messagingTemplate.convertAndSend("/topic/match." + session.getMatchId() + ".presence", payload);
    }

    private char sideOf(GameSession session, String username) {
        if (username != null && username.equals(session.getRedUsername())) {
            return 'r';
        }
        if (username != null && username.equals(session.getBlackUsername())) {
            return 'b';
        }
        throw new GameActionException("Bạn không thuộc trận đấu này");
    }

    private String illegalMoveReason(String board, XiangqiRules.Move move, char side) {
        List<XiangqiRules.Move> geometric = XiangqiRules.pseudoLegalMoves(board, side);
        if (!geometric.contains(move)) {
            return "Nước đi không hợp lệ với luật đi của quân cờ";
        }
        String next = XiangqiRules.apply(board, move);
        if (XiangqiRules.kingsFacing(next)) {
            return "Hai tướng không được đối mặt nhau";
        }
        if (XiangqiRules.isInCheck(next, side)) {
            return "Nước đi này khiến tướng của bạn bị chiếu";
        }
        return "Nước đi không hợp lệ";
    }

    private boolean inBoard(int x, int y) {
        return x >= 0 && x < XiangqiRules.WIDTH && y >= 0 && y < XiangqiRules.HEIGHT;
    }
}
