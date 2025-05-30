package com.chessxiangqi.xiangqi_backend.controller;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.model.OnlinePlayer;
import com.chessxiangqi.xiangqi_backend.model.Player;
import com.chessxiangqi.xiangqi_backend.model.PlayerMatch;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;
import com.chessxiangqi.xiangqi_backend.repository.PlayerMatchRepository;
import com.chessxiangqi.xiangqi_backend.service.ChallengeService;
import com.chessxiangqi.xiangqi_backend.service.MatchService;
import com.chessxiangqi.xiangqi_backend.service.MoveService;
import com.chessxiangqi.xiangqi_backend.service.PlayerMatchService;
import com.chessxiangqi.xiangqi_backend.service.PlayerService;
import com.chessxiangqi.xiangqi_backend.service.WebSocketService;
import com.chessxiangqi.xiangqi_backend.util.BoardChecker;
import com.chessxiangqi.xiangqi_backend.dto.ChallengeMessage;
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

    @MessageMapping("/user.connect")
    public void connectUser(@Payload String username, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        headerAccessor.getSessionAttributes().put("username", username);

        playerService.addOnlinePlayer(username, sessionId);

        log.info("Sending sessionId to user {}: {}", username, sessionId);

        // Gửi về topic theo username
        messagingTemplate.convertAndSend("/queue/session-" + username, sessionId);
        // Gửi danh sách online khi có người mới connect
        messagingTemplate.convertAndSend("/topic/users.online", playerService.getOnlinePlayers());
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        String sessionId = SimpMessageHeaderAccessor.wrap(event.getMessage()).getSessionId();
        playerService.removeOnlinePlayerBySessionId(sessionId);
        // Gửi danh sách online khi có người disconnect
        messagingTemplate.convertAndSend("/topic/users.online", playerService.getOnlinePlayers());
    }

    @MessageMapping("/challenge")
    public void handleChallenge(ChallengeMessage message) {
        String challengerUsername = message.getChallengerUsername();
        String targetUsername = message.getTargetUsername();
        
        log.info("[BE-10] Received challenge request from {} to {}", challengerUsername, targetUsername);
        
        // Kiểm tra người chơi có tồn tại không
        Optional<Player> playerOpt = playerService.getPlayerByUsername(targetUsername);
        if (playerOpt.isEmpty() || !playerService.isPlayerOnline(targetUsername)) {
            log.warn("[BE-11] Player {} is not online or does not exist", targetUsername);
            return;
        }

        // Kiểm tra người chơi có thể nhận thách đấu không
        if (!playerService.canBeChallenged(targetUsername)) {
            log.warn("[BE-12] Player {} cannot be challenged", targetUsername);
            return;
        }

        log.info("[BE-3] Sending challenge from {} to {}", challengerUsername, targetUsername);
        challengeService.sendChallenge(challengerUsername, targetUsername);
    }

    @MessageMapping("/challenge.accept")
    public void acceptChallenge(@Payload String challengerUsername, SimpMessageHeaderAccessor headerAccessor) {
        String targetUsername = (String) headerAccessor.getSessionAttributes().get("username");
        log.info("[BE-4] Challenge accepted by {} from {}", targetUsername, challengerUsername);

        try {
            // Lấy Player object từ username
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
                return;
            }
            var player1 = player1Opt.get();
            var player2 = player2Opt.get();

            log.info("[BE-6] Creating match between {} (status: {}) and {} (status: {})", 
                player1.getUsername(), player1.getStatus(),
                player2.getUsername(), player2.getStatus());

            // Tạo match mới
            Match match = new Match();
            match.setPlayer1(player1); // Player 1 sẽ là đỏ (r)
            match.setPlayer2(player2); // Player 2 sẽ là đen (b)
            match.setStartDate(new Date());
            // Lưu match vào database
            match = matchService.createMatch(match);

            // Tạo move đầu tiên với trạng thái bàn cờ ban đầu
            Move initialMove = new Move();
            initialMove.setMatchId(match.getId());
            initialMove.setTurnNumber(0);
            String initialBoardState =    "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR";
            initialMove.setBoardState(initialBoardState);
            initialMove.setNextTurn("r");
            moveService.saveMove(initialMove);

            // Tạo PlayerMatch cho cả hai người chơi
            playerMatchService.createPlayerMatch(match.getPlayer1(), match.getPlayer2(), match);
            playerMatchService.createPlayerMatch(match.getPlayer2(), match.getPlayer1(), match);

            // Cập nhật trạng thái cả hai người chơi thành IN_GAME
            playerService.updatePlayerStatus(challengerUsername, PlayerStatus.IN_GAME);
            playerService.updatePlayerStatus(targetUsername, PlayerStatus.IN_GAME);

            log.info("[BE-7] Updated player statuses - {}: IN_GAME, {}: IN_GAME", 
                challengerUsername, targetUsername);

            // Gửi danh sách online một lần duy nhất sau khi cập nhật status
            List<OnlinePlayer> onlinePlayers = playerService.getOnlinePlayers();
            log.info("[BE-8] Sending updated online players list. Count: {}", onlinePlayers.size());
            messagingTemplate.convertAndSend("/topic/users.online", onlinePlayers);

            // Gửi thông báo chấp nhận thách đấu kèm matchId và thông tin người chơi
            Map<String, Object> response = new HashMap<>();
            response.put("type", "CHALLENGE_ACCEPTED");
            response.put("from", targetUsername);
            response.put("matchId", match.getId());
            response.put("player1", Map.of(
                "id", player1.getId(),
                "username", player1.getUsername(),
                "color", "r"
            ));
            response.put("player2", Map.of(
                "id", player2.getId(),
                "username", player2.getUsername(),
                "color", "b"
            ));
            response.put("currentTurn", "r");
            response.put("initialBoardState", initialMove.getBoardState());

            log.info("[BE-9] Sending challenge accepted notifications to both players");
            messagingTemplate.convertAndSendToUser(
                challengerUsername,
                "/queue/challenge",
                response
            );
            messagingTemplate.convertAndSendToUser(
                targetUsername,
                "/queue/challenge",
                response
            );

            log.info("[BE-10] Match created with ID: {} between {} and {}", 
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
        }
    }

    @MessageMapping("/challenge.reject")
    public void rejectChallenge(@Payload String challengerUsername, SimpMessageHeaderAccessor headerAccessor) {
        String targetUsername = (String) headerAccessor.getSessionAttributes().get("username");
        log.info("[BE-12] Challenge rejected by {} from {}", targetUsername, challengerUsername);
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
    public void handleMove(@Payload String moveData, @DestinationVariable String matchId) {
        try {
            // 1. Parse dữ liệu từ FE
            Map<String, Object> move = new ObjectMapper().readValue(moveData, Map.class);

            // 2. Lấy các trường cần thiết
            String boardState = (String) move.get("boardState");
            String moveDescription = (String) move.get("moveDescription");
            Integer fromX = (Integer) move.get("fromX");
            Integer fromY = (Integer) move.get("fromY");
            Integer toX = (Integer) move.get("toX");
            Integer toY = (Integer) move.get("toY");
            String pieceType = (String) move.get("pieceType");
            String color = (String) move.get("color");
            String playerId = (String) move.get("playerId");

            // 3. Lưu nước đi vào database
            Move moveEntity = new Move();
            moveEntity.setMatchId(matchId);
            moveEntity.setBoardState(boardState);
            moveEntity.setTurnNumber(moveService.getNextTurnNumber(matchId));
            moveEntity.setMoveDescription(moveDescription);

            // Lấy nước đi trước để xác định nextTurn
            Move previousMove = moveService.getLatestMove(matchId);
            moveEntity.setNextTurn(previousMove.getNextTurn().equals("r") ? "b" : "r");

            moveService.saveMove(moveEntity);

            // 4. Gửi cập nhật trạng thái bàn cờ cho cả hai người chơi
            Map<String, Object> response = new HashMap<>();
            response.put("boardState", boardState);
            response.put("moveDescription", moveDescription);
            response.put("fromX", fromX);
            response.put("fromY", fromY);
            response.put("toX", toX);
            response.put("toY", toY);
            response.put("pieceType", pieceType);
            response.put("color", color);
            response.put("playerId", playerId);
            response.put("nextTurn", moveEntity.getNextTurn());

            // Thêm đoạn kiểm tra chiếu
            Map<String, Boolean> checkStatus = BoardChecker.checkBoardState(boardState);
            
            // Thêm thông tin chiếu vào response
            response.put("isCheck", checkStatus.get("redCheck") || checkStatus.get("blackCheck"));
            response.put("redCheck", checkStatus.get("redCheck"));
            response.put("blackCheck", checkStatus.get("blackCheck"));

            messagingTemplate.convertAndSend(
                "/topic/match." + matchId + ".board",
                response
            );

            // Sau khi nhận boardState mới
            boolean redKingAlive = boardState.contains("k");
            boolean blackKingAlive = boardState.contains("K");
            
            log.info("Checking king status - Red king alive: {}, Black king alive: {}", redKingAlive, blackKingAlive);
            log.info("Current board state: {}", boardState);

            if (!redKingAlive || !blackKingAlive) {
                log.info("Game over detected - Red king: {}, Black king: {}", redKingAlive, blackKingAlive);
                Optional<Match> matchOpt = matchService.getMatchById(matchId);
                if (matchOpt.isEmpty()) {
                    log.error("Match not found for ID: {}", matchId);
                    return;
                }
                Match match = matchOpt.get();
                String player1Id = match.getPlayer1().getId();
                String player2Id = match.getPlayer2().getId();
                String winnerId = redKingAlive ? player1Id : player2Id;
                log.info("Winner determined: {} (Red king alive: {}, Black king alive: {})", 
                    winnerId, redKingAlive, blackKingAlive);

                // 1. Lấy PlayerMatch hiện tại
                List<PlayerMatch> existingMatches = playerMatchRepository.findByMatchId(matchId);
                log.info("Found {} existing PlayerMatch records", existingMatches.size());
                
                // 2. Cập nhật kết quả cho PlayerMatch
                for (PlayerMatch pm : existingMatches) {
                    if (pm.getPlayerId().equals(winnerId)) {
                        pm.setResult("WIN");
                        pm.setEloChange(calculateEloChange(match.getPlayer1(), match.getPlayer2(), true));
                    } else {
                        pm.setResult("LOSE");
                        pm.setEloChange(calculateEloChange(match.getPlayer1(), match.getPlayer2(), false));
                    }
                    playerMatchRepository.save(pm);
                }
                log.info("Updated PlayerMatch records");

                // 3. Cập nhật thông tin người chơi
                for (PlayerMatch pm : existingMatches) {
                    Player playerToUpdate = pm.getPlayerId().equals(player1Id) ? match.getPlayer1() : match.getPlayer2();
                    log.info("Updating player {} with result {} and eloChange {}", 
                        playerToUpdate.getUsername(), pm.getResult(), pm.getEloChange());
                    
                    // Lấy thông tin player mới nhất từ database
                    Optional<Player> currentPlayerOpt = playerService.getPlayerById(playerToUpdate.getId());
                    if (currentPlayerOpt.isPresent()) {
                        playerToUpdate = currentPlayerOpt.get();
                        log.info("Current player stats - Elo: {}, Wins: {}, Loses: {}, Draws: {}", 
                            playerToUpdate.getElo(), playerToUpdate.getWins(), 
                            playerToUpdate.getLoses(), playerToUpdate.getDraws());
                    }
                    
                    playerService.applyMatchResult(
                        playerToUpdate,
                        pm.getEloChange(),
                        pm.getResult()
                    );
                    
                    // Kiểm tra sau khi cập nhật
                    Optional<Player> updatedPlayerOpt = playerService.getPlayerById(playerToUpdate.getId());
                    if (updatedPlayerOpt.isPresent()) {
                        Player updatedPlayer = updatedPlayerOpt.get();
                        log.info("Updated player stats - Elo: {}, Wins: {}, Loses: {}, Draws: {}", 
                            updatedPlayer.getElo(), updatedPlayer.getWins(), 
                            updatedPlayer.getLoses(), updatedPlayer.getDraws());
                    }
                }
                log.info("Updated player stats");

                // 4. Lấy thông tin người chơi đã cập nhật
                Player updatedPlayer1 = playerService.getPlayerById(player1Id).orElse(null);
                Player updatedPlayer2 = playerService.getPlayerById(player2Id).orElse(null);
                log.info("Retrieved updated player info");

                // 5. Gửi thông tin kết thúc trận đấu
                Map<String, Object> endGameMsg = new HashMap<>();
                endGameMsg.put("type", "END_GAME");
                endGameMsg.put("winner", redKingAlive ? "red" : "black");
                endGameMsg.put("player1", updatedPlayer1);
                endGameMsg.put("player2", updatedPlayer2);
                endGameMsg.put("player1EloChange", existingMatches.stream()
                    .filter(pm -> pm.getPlayerId().equals(player1Id))
                    .findFirst()
                    .map(PlayerMatch::getEloChange)
                    .orElse(0));
                endGameMsg.put("player2EloChange", existingMatches.stream()
                    .filter(pm -> pm.getPlayerId().equals(player2Id))
                    .findFirst()
                    .map(PlayerMatch::getEloChange)
                    .orElse(0));
                log.info("Sending end game message: {}", endGameMsg);
                messagingTemplate.convertAndSend("/topic/match." + matchId + ".end", endGameMsg);
                return;
            }
        } catch (Exception e) {
            log.error("Error handling move: {}", e.getMessage());
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
                // Không update status về ONLINE nữa vì chúng ta muốn giữ status IN_GAME
                
                // Không gửi danh sách online ở đây nữa
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

    // Helper method to calculate Elo change
    private int calculateEloChange(Player player1, Player player2, boolean isWinner) {
        int basePoint = 20;
        double ratio = (double) Math.max(player1.getElo(), player2.getElo()) / Math.min(player1.getElo(), player2.getElo());
        int pointChange;
        
        if (isWinner) {
            pointChange = player1.getElo() < player2.getElo() ? 
                (int) Math.round(basePoint * ratio) : 
                (int) Math.round(basePoint / ratio);
        } else {
            pointChange = player1.getElo() < player2.getElo() ? 
                -(int) Math.round(basePoint / ratio) : 
                -(int) Math.round(basePoint * ratio);
        }
        
        return pointChange;
    }
} 