package com.chessxiangqi.xiangqi_backend.service;

import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.model.Move;
import com.chessxiangqi.xiangqi_backend.model.PlayerStatus;
import com.chessxiangqi.xiangqi_backend.repository.MatchRepository;
import com.chessxiangqi.xiangqi_backend.repository.MoveRepository;
import com.chessxiangqi.xiangqi_backend.repository.PlayerRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AIGameService {
    private static final String AI_USERNAME = "da1";

    @Autowired
    private PlayerService playerService;

    @Autowired
    private MatchService matchService;

    @Autowired
    private MoveService moveService;

    @Autowired
    private ChessDBAIService chessDBAIService;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private MoveRepository moveRepository;

    @Autowired
    private PlayerRepository playerRepository;

    /**
     * Khởi tạo game với AI
     */
    public Match initializeGameWithAI(String playerUsername) {
        try {
            // 1. Lấy thông tin người chơi
            var playerOpt = playerService.getPlayerByUsername(playerUsername);
            if (playerOpt.isEmpty()) {
                log.error("Player not found: {}", playerUsername);
                return null;
            }
            var player = playerOpt.get();

            // 2. Lấy thông tin AI player
            var aiPlayerOpt = playerService.getPlayerByUsername(AI_USERNAME);
            if (aiPlayerOpt.isEmpty()) {
                log.error("AI player not found: {}", AI_USERNAME);
                return null;
            }
            var aiPlayer = aiPlayerOpt.get();

            // 3. Tạo match mới
            Match match = new Match();
            match.setPlayer1(player);
            match.setPlayer2(aiPlayer);
            match.setIsAIGame(true);
            match = matchService.createMatch(match);

            // 4. Tạo move đầu tiên với trạng thái bàn cờ ban đầu
            Move initialMove = new Move();
            initialMove.setMatchId(match.getId());
            initialMove.setTurnNumber(0);
            String initialBoardState = "rheakaehr..........c.....c.p.p.p.p.p..................P.P.P.P.P.C.....C..........RHEAKAEHR";
            initialMove.setBoardState(initialBoardState);
            initialMove.setNextTurn("r");
            moveService.saveMove(initialMove);

            // 5. Cập nhật trạng thái người chơi
            playerService.updatePlayerStatus(playerUsername, PlayerStatus.IN_GAME);
            playerService.updatePlayerStatus(AI_USERNAME, PlayerStatus.IN_GAME);

            return match;
        } catch (Exception e) {
            log.error("Error initializing game with AI: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Xử lý nước đi của AI
     */
    public Move processAIMove(String matchId, String currentBoardState, String currentTurn) {
        try {
            log.info("[BE-AI] Processing AI move for match: {}", matchId);
            
            // 1. Lấy thông tin match
            Optional<Match> matchOpt = matchRepository.findById(matchId);
            if (matchOpt.isEmpty()) {
                log.error("[BE-AI] Match not found: {}", matchId);
                return null;
            }
            Match match = matchOpt.get();

            // 2. Gọi API để lấy nước đi của AI
            Map<String, String> aiMoveResult = chessDBAIService.getAIMove(currentBoardState, currentTurn, matchId);
            if (aiMoveResult == null || aiMoveResult.get("newBoardState") == null || aiMoveResult.get("fenMove") == null) {
                log.error("[BE-AI] Failed to get AI move or invalid result");
                return null;
            }
            String newBoardState = aiMoveResult.get("newBoardState");
            String fenMove = aiMoveResult.get("fenMove");

            // 3. Tạo move mới cho AI
            Move move = new Move();
            move.setMatchId(matchId);
            move.setTurnNumber(moveService.getNextTurnNumber(matchId));
            move.setNextTurn("r"); // Chuyển lượt về cho người chơi (quân đỏ)

            if (newBoardState == null) {
                log.warn("[BE-AI] AI move '{}' could not be applied to board. Board state remains unchanged.", fenMove);
                move.setBoardState(currentBoardState); // Board state remains as it was before AI's turn
                move.setMoveDescription(fenMove + " (invalid)"); // Mark as invalid
            } else {
                move.setBoardState(newBoardState);
                move.setMoveDescription(fenMove);
            }

            // 4. Lưu move vào database
            move = moveRepository.save(move);
            log.info("[BE-AI] AI move saved: {}", move);

            return move;
        } catch (Exception e) {
            log.error("[BE-AI] Error processing AI move: {}", e.getMessage());
            return null;
        }
    }
} 