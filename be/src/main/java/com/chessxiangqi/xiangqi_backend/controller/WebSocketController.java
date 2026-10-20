package com.chessxiangqi.xiangqi_backend.controller;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.chessxiangqi.xiangqi_backend.dto.ChallengeMessage;
import com.chessxiangqi.xiangqi_backend.dto.DrawOfferRequest;
import com.chessxiangqi.xiangqi_backend.dto.DrawResponseRequest;
import com.chessxiangqi.xiangqi_backend.dto.SurrenderRequest;
import com.chessxiangqi.xiangqi_backend.model.GameSession;
import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.service.ChallengeService;
import com.chessxiangqi.xiangqi_backend.service.GameSessionService;
import com.chessxiangqi.xiangqi_backend.service.MatchService;
import com.chessxiangqi.xiangqi_backend.service.MoveService;
import com.chessxiangqi.xiangqi_backend.service.PlayerMatchService;
import com.chessxiangqi.xiangqi_backend.service.PlayerService;
import com.chessxiangqi.xiangqi_backend.service.WebSocketService;
import com.chessxiangqi.xiangqi_backend.util.XiangqiNotation;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
public class WebSocketController {

    @Autowired
    private PlayerService playerService;

    @Autowired
    private MatchService matchService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MoveService moveService;

    @Autowired
    private WebSocketService webSocketService;

    @Autowired
    private PlayerMatchService playerMatchService;

    @Autowired
    private PlayerMatchRepository playerMatchRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ChallengeService challengeService;

    @Autowired
    private GameSessionService gameSessionService;

    @MessageMapping("/user.connect")
    public void connectUser(@Payload String username, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        headerAccessor.getSessionAttributes().put("username", username);

        playerService.addOnlinePlayer(username, sessionId);
        // Nếu đang có trận dở thì giữ trạng thái đang chơi và báo đối thủ đã kết nối lại
        gameSessionService.onPlayerConnected(username);

        log.info("Sending sessionId to user {}: {}", username, sessionId);

        // Gửi về topic theo username
        messagingTemplate.convertAndSend("/queue/session-" + username, sessionId);
        // Gửi danh sách online khi có người mới connect
        messagingTemplate.convertAndSend("/topic/users.online", playerService.getOnlinePlayers());

        // Gửi danh sách online riêng cho user mới connect
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/online-users",
            playerService.getOnlinePlayers()
        );
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        Map<String, Object> attributes = accessor.getSessionAttributes();
        String username = attributes == null ? null : (String) attributes.get("username");
        boolean wasCurrentSession = playerService.removeOnlinePlayerBySessionId(sessionId);
        if (wasCurrentSession && username != null) {
            gameSessionService.onPlayerDisconnected(username);
        }
        // Gửi danh sách online khi có người disconnect
        messagingTemplate.convertAndSend("/topic/users.online", playerService.getOnlinePlayers());
    }

    @MessageMapping("/challenge")
    public void handleChallenge(ChallengeMessage message) {
        log.debug("[BE-10] Received challenge request from {} to {}", message.getChallengerUsername(), message.getTargetUsername());
        challengeService.sendChallenge(message.getChallengerUsername(), message.getTargetUsername());
    }

    @MessageMapping("/challenge.accept")
    public void acceptChallenge(@Payload String challengerUsername, SimpMessageHeaderAccessor headerAccessor) {
        String targetUsername = (String) headerAccessor.getSessionAttributes().get("username");
        log.debug("[BE-4] Challenge accepted by {} from {}", targetUsername, challengerUsername);

        // Lời mời đã hết hạn hoặc đã bị huỷ: không cho vào trận
        if (!challengeService.isPending(challengerUsername, targetUsername)) {
            Map<String, Object> expired = new HashMap<>();
            expired.put("type", "CHALLENGE_ERROR");
            expired.put("code", "CHALLENGE_EXPIRED");
            expired.put("message", "Lời mời đã hết hạn hoặc đã bị huỷ.");
            messagingTemplate.convertAndSendToUser(targetUsername, "/queue/challenge", expired);
            return;
        }

        try {
            // 1. Lấy Player object từ username
            var player1Opt = playerService.getPlayerByUsername(challengerUsername);
            var player2Opt = playerService.getPlayerByUsername(targetUsername);
            if (player1Opt.isEmpty() || player2Opt.isEmpty()) {
                log.error("[BE-5] Players not found - Player1: {}, Player2: {}", 
                    challengerUsername, targetUsername);
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("type", "ERROR");
                errorResponse.put("message", "Không tìm thấy người chơi");
                messagingTemplate.convertAndSendToUser(
                    challengerUsername,
                    "/queue/challenge",
                    errorResponse
                );
                messagingTemplate.convertAndSendToUser(
                    targetUsername,
                    "/queue/challenge",
                    errorResponse
                );
                return;
            }
            var player1 = player1Opt.get();
            var player2 = player2Opt.get();

            // 2. Tạo match mới
            Match match = new Match();
            match.setId(UUID.randomUUID().toString());
            match.setPlayer1(player1);
            match.setPlayer2(player2);
            match.setCreatedAt(new Date());
            match = matchService.createMatch(match);

            // 3. Tạo move đầu tiên với trạng thái bàn cờ ban đầu
            Move initialMove = new Move();
            initialMove.setMatchId(match.getId());
            initialMove.setTurnNumber(0);
            String initialBoardState = "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR";
            initialMove.setBoardState(initialBoardState);
            initialMove.setNextTurn("r");
            moveService.saveMove(initialMove);
            // Đưa trận vào bộ nhớ ngay để các lần tải trang sau không phải hỏi DB
            gameSessionService.registerNewMatch(match, initialMove);

            // 4. Tạo PlayerMatch cho cả hai người chơi
            playerMatchService.createPlayerMatch(match.getPlayer1(), match.getPlayer2(), match);
            playerMatchService.createPlayerMatch(match.getPlayer2(), match.getPlayer1(), match);

            // 5. Gọi service để từ chối các lời mời khác
            challengeService.acceptChallenge(challengerUsername, targetUsername);

            // 6. Cập nhật trạng thái cả hai người chơi thành IN_GAME
            playerService.updatePlayerStatus(challengerUsername, PlayerStatus.IN_GAME);
            playerService.updatePlayerStatus(targetUsername, PlayerStatus.IN_GAME);

            // 7. Gửi thông báo chấp nhận thách đấu kèm matchId và thông tin người chơi
            Map<String, Object> response = new HashMap<>();
            response.put("type", "CHALLENGE_ACCEPTED");
            response.put("from", targetUsername);
            response.put("message", "Lời mời đã được chấp nhận. Đang khởi tạo trận đấu.");
            response.put("accepterUsername", targetUsername);
            response.put("challengerUsername", challengerUsername);
            response.put("matchId", match.getId());
            response.put("player1", Map.of(
                "id", player1.getId(),
                "username", player1.getUsername(),
                "color", "r",
                "elo", player1.getElo()
            ));
            response.put("player2", Map.of(
                "id", player2.getId(),
                "username", player2.getUsername(),
                "color", "b",
                "elo", player2.getElo()
            ));
            response.put("currentTurn", "r");
            response.put("initialBoardState", initialMove.getBoardState());

            // 8. Gửi thông báo cho cả hai người chơi
            log.debug("[BE-9] Sending challenge accepted notification to both players");
            log.debug("[BE-9.1] Notification content: {}", response);
            
            messagingTemplate.convertAndSendToUser(
                challengerUsername,
                "/queue/challenge",
                response
            );
            log.debug("[BE-9.2] Sent to challenger: {}", challengerUsername);
            
            messagingTemplate.convertAndSendToUser(
                targetUsername,
                "/queue/challenge",
                response
            );
            log.debug("[BE-9.3] Sent to target: {}", targetUsername);

            // 9. Gửi danh sách online mới
            messagingTemplate.convertAndSend("/topic/users.online", playerService.getOnlinePlayers());

            log.debug("[BE-10] Match created with ID: {} between {} and {}", 
                match.getId(), challengerUsername, targetUsername);
        } catch (Exception e) {
            log.error("[BE-11] Error creating match: {}", e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("type", "ERROR");
            errorResponse.put("message", "Không thể tạo trận đấu");
            messagingTemplate.convertAndSendToUser(
                challengerUsername,
                "/queue/challenge",
                errorResponse
            );
            messagingTemplate.convertAndSendToUser(
                targetUsername,
                "/queue/challenge",
                errorResponse
            );
        }
    }

    @MessageMapping("/challenge.cancel")
    public void cancelChallenge(@Payload String targetUsername, SimpMessageHeaderAccessor headerAccessor) {
        String challengerUsername = (String) headerAccessor.getSessionAttributes().get("username");
        log.debug("[BE-CHALLENGE-CANCEL] {} cancels challenge to {}", challengerUsername, targetUsername);
        challengeService.cancelChallenge(challengerUsername, targetUsername);
    }

    @MessageMapping("/challenge.reject")
    public void rejectChallenge(@Payload String challengerUsername, SimpMessageHeaderAccessor headerAccessor) {
        String targetUsername = (String) headerAccessor.getSessionAttributes().get("username");
        log.debug("[BE-12] Challenge rejected by {} from {}", targetUsername, challengerUsername);
        challengeService.rejectChallenge(challengerUsername, targetUsername);
    }

    @MessageMapping("/match.{matchId}.info")
    public void getMatchInfo(@Payload String username, @DestinationVariable String matchId) {
        Optional<Match> matchOpt = matchService.getMatchById(matchId);
        if (matchOpt.isPresent()) {
            Match match = matchOpt.get();
            Map<String, String> response = new HashMap<>();
            response.put("player1Id", match.getPlayer1().getId());
            response.put("player2Id", match.getPlayer2().getId());
            
            messagingTemplate.convertAndSend(
                "/topic/match." + matchId + ".info",
                response
            );
        }
    }

    @MessageMapping("/match.{matchId}.move")
    public void handleMove(@Payload String moveData, @DestinationVariable String matchId,
                           SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        try {
            // Server tự kiểm tra lượt, người chơi và luật; client chỉ gửi tọa độ
            JsonNode node = objectMapper.readTree(moveData);
            gameSessionService.makeMove(matchId, username,
                node.path("fromX").asInt(-1), node.path("fromY").asInt(-1),
                node.path("toX").asInt(-1), node.path("toY").asInt(-1));
        } catch (GameSessionService.GameActionException e) {
            gameSessionService.sendError(username, e.getMessage());
        } catch (Exception e) {
            log.error("Error handling move: {}", e.getMessage());
            gameSessionService.sendError(username, "Nước đi không hợp lệ");
        }
    }

    /** Đi lại (chỉ ván với máy): hoàn tác cặp nước gần nhất. */
    @MessageMapping("/match.{matchId}.undo")
    public void handleUndo(@DestinationVariable String matchId, SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        try {
            gameSessionService.undo(matchId, username);
        } catch (GameSessionService.GameActionException e) {
            gameSessionService.sendError(username, e.getMessage());
        } catch (Exception e) {
            log.error("Error undoing move: {}", e.getMessage(), e);
            gameSessionService.sendError(username, "Không thể đi lại");
        }
    }

    @MessageMapping("/match.{matchId}.end")
    public void endMatch(@Payload String result, @DestinationVariable String matchId) {
        try {
            // Cập nhật kết quả match
            matchService.updateMatchResult(matchId, result);
            
            // Cập nhật trạng thái người chơi
            Optional<Match> matchOpt = matchService.getMatchById(matchId);
            if (matchOpt.isPresent()) {
                Match match = matchOpt.get();
                // Cập nhật trạng thái người chơi về ONLINE khi game kết thúc
                playerService.updatePlayerStatus(match.getPlayer1().getUsername(), PlayerStatus.ONLINE);
                playerService.updatePlayerStatus(match.getPlayer2().getUsername(), PlayerStatus.ONLINE);
                
                // Gửi danh sách online mới
                messagingTemplate.convertAndSend("/topic/users.online", playerService.getOnlinePlayers());
            }
        } catch (Exception e) {
            log.error("Error ending match: {}", e.getMessage());
        }
    }

    @MessageMapping("/echo")
    public void echo(@Payload String username, SimpMessageHeaderAccessor headerAccessor) {
        String sessionUser = (String) headerAccessor.getSessionAttributes().get("username");
        String sessionId = headerAccessor.getSessionId();
        log.info("Received echo from user: {} (sessionId: {})", sessionUser, sessionId);
        log.info("Session attributes: {}", headerAccessor.getSessionAttributes());

        String response = "Hello " + sessionUser + " (sessionId: " + sessionId + "), this is your echo!";
        log.info("Sending echo to user: {} (sessionId: {})", sessionUser, sessionId);

        try {
            // Gửi echo response qua user destination
            messagingTemplate.convertAndSendToUser(
                sessionUser,
                "/queue/echo",
                response
            );
            log.info("Successfully sent echo to user {}", sessionUser);
        } catch (Exception e) {
            log.error("Error sending echo to user {}: {}", sessionUser, e.getMessage());
        }
    }

    @MessageMapping("/challenge.send")
    public void handleChallengeSend(@Payload String targetUsername, SimpMessageHeaderAccessor headerAccessor) {
        String fromUsername = (String) headerAccessor.getSessionAttributes().get("username");
        challengeService.sendChallenge(fromUsername, targetUsername);
    }

    @MessageMapping("/game.surrender")
    public void handleSurrender(@Payload SurrenderRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        log.debug("[BE-Game] Received surrender request: matchId={}, username={}", request.getMatchId(), username);
        try {
            gameSessionService.surrender(request.getMatchId(), username);
        } catch (GameSessionService.GameActionException e) {
            gameSessionService.sendError(username, e.getMessage());
        }
    }

    @MessageMapping("/game.drawOffer")
    public void handleDrawOffer(@Payload DrawOfferRequest request) {
        log.debug("[BE-Game] ====== Draw Offer Request Received ======");
        log.debug("[BE-Game] Request details: matchId={}, playerId={}", request.getMatchId(), request.getPlayerId());
        
        Optional<Match> matchOpt = matchService.getMatchById(request.getMatchId());
        if (matchOpt.isEmpty()) {
            log.error("[BE-Game] Draw offer: Match not found: {}", request.getMatchId());
            return;
        }
        
        Match match = matchOpt.get();
        String opponentId = match.getPlayer1().getId().equals(request.getPlayerId()) 
            ? match.getPlayer2().getId() 
            : match.getPlayer1().getId();
            
        log.debug("[BE-Game] Match details: player1={}, player2={}, opponentId={}", 
            match.getPlayer1().getId(), match.getPlayer2().getId(), opponentId);
            
        // Gửi thông báo đề nghị hòa cờ đến đối thủ
        Map<String, Object> response = new HashMap<>();
        response.put("type", "DRAW_OFFER");
        response.put("from", request.getPlayerId());
        response.put("matchId", request.getMatchId());
        
        log.debug("[BE-Game] Sending draw offer notification to opponent: {}", opponentId);
        log.debug("[BE-Game] Draw offer message content: {}", response);
        log.debug("[BE-Game] Sending to topic: /topic/match.{}.drawOffer", request.getMatchId());
        
        try {
            messagingTemplate.convertAndSend("/topic/match." + request.getMatchId() + ".drawOffer", response);
            log.debug("[BE-Game] Draw offer message sent successfully");
        } catch (Exception e) {
            log.error("[BE-Game] Error sending draw offer message: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/game.drawResponse") 
    public void handleDrawResponse(@Payload DrawResponseRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        log.debug("[BE-Game] Received draw response: matchId={}, playerId={}, accepted={}", 
            request.getMatchId(), request.getPlayerId(), request.isAccepted());
            
        Optional<Match> matchOpt = matchService.getMatchById(request.getMatchId());
        if (matchOpt.isEmpty()) {
            log.error("[BE-Game] Draw response: Match not found: {}", request.getMatchId());
            return;
        }
        
        Match match = matchOpt.get();
        String opponentId = match.getPlayer1().getId().equals(request.getPlayerId()) 
            ? match.getPlayer2().getId() 
            : match.getPlayer1().getId();
            
        if (request.isAccepted()) {
            // Hòa cờ: kết thúc qua GameSessionService để thống nhất thống kê và Elo
            try {
                gameSessionService.acceptDraw(request.getMatchId(), username);
            } catch (GameSessionService.GameActionException e) {
                gameSessionService.sendError(username, e.getMessage());
            }
        } else {
            // Gửi thông báo từ chối hòa cờ đến đối thủ
            Map<String, Object> response = new HashMap<>();
            response.put("type", "DRAW_REJECTED");
            response.put("from", request.getPlayerId());
            response.put("matchId", request.getMatchId());
            
            messagingTemplate.convertAndSend("/topic/match." + request.getMatchId() + ".drawResponse", response);
        }
    }

    /** Bắt đầu ván với máy. Payload JSON: {"username": "...", "level": 1-5, "side": "r" | "b"} (side = bên người cầm). */
    @MessageMapping("/game.withAI")
    public void startGameWithAI(@Payload String payload, SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        try {
            JsonNode node = objectMapper.readTree(payload);
            if (username == null) {
                username = node.path("username").asText(null);
            }
            String side = node.path("side").asText("r");
            GameSession session = gameSessionService.startAiGame(
                username, node.path("level").asInt(0), side.isEmpty() ? ' ' : side.charAt(0));

            Match match = matchService.getMatchById(session.getMatchId()).orElseThrow();
            Player red = match.getPlayer1();
            Player black = match.getPlayer2();
            Map<String, Object> response = new HashMap<>();
            response.put("type", "GAME_STARTED");
            response.put("matchId", match.getId());
            response.put("player1", Map.of("id", red.getId(), "username", red.getUsername(), "color", "r", "elo", red.getElo()));
            response.put("player2", Map.of("id", black.getId(), "username", black.getUsername(), "color", "b", "elo", black.getElo()));
            response.put("currentTurn", "r");
            response.put("initialBoardState", XiangqiNotation.INITIAL_BOARD);
            response.put("aiLevel", session.getAiLevel());
            response.put("aiSide", String.valueOf(session.getAiSide()));
            messagingTemplate.convertAndSendToUser(username, "/queue/game.withAI", response);
            log.info("[AI] Ván với máy: matchId={}, người chơi={}, level={}", match.getId(), username, session.getAiLevel());
        } catch (GameSessionService.GameActionException e) {
            sendAiError(username, e.getMessage());
        } catch (Exception e) {
            log.error("[AI] Error starting game with AI", e);
            sendAiError(username, "Lỗi khi tạo trận đấu với máy");
        }
    }

    private void sendAiError(String username, String message) {
        if (username == null) {
            return;
        }
        Map<String, String> error = new HashMap<>();
        error.put("type", "ERROR");
        error.put("message", message);
        messagingTemplate.convertAndSendToUser(username, "/queue/game.withAI", error);
    }
}
