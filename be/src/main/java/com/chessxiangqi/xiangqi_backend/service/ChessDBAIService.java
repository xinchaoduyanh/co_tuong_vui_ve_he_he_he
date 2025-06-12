package com.chessxiangqi.xiangqi_backend.service;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.chessxiangqi.xiangqi_backend.model.Move;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ChessDBAIService {

    @Value("${chessdb.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private static final String INITIAL_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";
    private static final String INITIAL_BOARD = "RNBAKABNR/9/1C5C1/P1P1P1P1P/9/9/p1p1p1p1p/1c5c1/9/rnbakabnr";

    @Autowired
    private MoveService moveService;

    public ChessDBAIService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Chuyển đổi boardState sang FEN
     */
    public String convertToFEN(String boardState, String currentTurn) {
        StringBuilder fen = new StringBuilder();
        int emptyCount = 0;

        // Chuyển đổi từng hàng (từ trên xuống dưới)
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                char piece = boardState.charAt(row * 9 + col);
                if (piece == '.') {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen.append(emptyCount);
                        emptyCount = 0;
                    }
                    // Chuyển đổi ký hiệu quân cờ
                    char fenPiece = switch (piece) {
                        case 'r' -> 'R'; // Xe đỏ
                        case 'h' -> 'N'; // Mã đỏ (Knight)
                        case 'e' -> 'B'; // Tượng đỏ (Bishop)
                        case 'a' -> 'A'; // Sĩ đỏ (Advisor)
                        case 'k' -> 'K'; // Tướng đỏ (King)
                        case 'c' -> 'C'; // Pháo đỏ (Cannon)
                        case 'p' -> 'P'; // Tốt đỏ (Pawn)
                        case 'R' -> 'r'; // Xe đen
                        case 'H' -> 'n'; // Mã đen
                        case 'E' -> 'b'; // Tượng đen
                        case 'A' -> 'a'; // Sĩ đen
                        case 'K' -> 'k'; // Tướng đen
                        case 'C' -> 'c'; // Pháo đen
                        case 'P' -> 'p'; // Tốt đen
                        default -> piece;
                    };
                    fen.append(fenPiece);
                }
            }
            if (emptyCount > 0) {
                fen.append(emptyCount);
                emptyCount = 0;
            }
            if (row < 9) {
                fen.append('/');
            }
        }

        // Thêm các thông tin khác của FEN
        // Lượt đi: 'r' (red) -> 'w' (white in chess), 'b' (black) -> 'b' (black in chess)
        String activeColor = currentTurn.equals("r") ? "w" : "b";
        fen.append(" " + activeColor + " - - 0 1"); // Lượt đi, không có castling, en passant, nửa nước, số nước đầy đủ
        return fen.toString();
    }

    /**
     * Chuyển đổi tọa độ từ FEN sang hệ tọa độ của hệ thống
     */
    public int[] convertFENCoordinates(String fenMove) {
        // fenMove format: "b2g2" (tọa độ cờ tướng)
        int[] coordinates = new int[4];
        // FEN coordinates are like a0, a1, ..., i9 (column then row)
        // Our system is (x,y) where x is column (0-8) and y is row (0-9)

        // From X, From Y
        coordinates[0] = 8 - (fenMove.charAt(0) - 'a'); // fromX (0-8) - Đảo ngược X
        coordinates[1] = '9' - fenMove.charAt(1); // fromY (0-9) - Đảo ngược Y

        // To X, To Y
        coordinates[2] = 8 - (fenMove.charAt(2) - 'a'); // toX (0-8) - Đảo ngược X
        coordinates[3] = '9' - fenMove.charAt(3); // toY (0-9) - Đảo ngược Y
        return coordinates;
    }

    /**
     * Gọi API để lấy nước đi của AI
     */
    public Map<String, String> getAIMove(String boardState, String currentTurn, String matchId) {
        try {
            // 1. Chuẩn bị tham số board với FEN ban đầu và lịch sử nước đi
            String boardParam = INITIAL_FEN;
            String moveHistory = getMoveHistory(matchId);
            if (!moveHistory.isEmpty()) {
                boardParam += " moves " + moveHistory;
            }
            // Mã hóa thủ công boardParam để đảm bảo dấu cách thành '+'
            String encodedBoardParam = URLEncoder.encode(boardParam, StandardCharsets.UTF_8.toString());

            // 2. Gọi API với action=querybest
            // Xây dựng URL thủ công để kiểm soát việc mã hóa tham số 'board'
            String url = String.format("%s?action=querybest&board=%s", apiUrl, encodedBoardParam);

            // Thêm tiêu đề User-Agent và Accept để mô phỏng curl
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "curl/8.2.1"); // Đã cập nhật User-Agent khớp với phiên bản curl của bạn
            headers.set("Accept", "*/*"); // Thêm header Accept

            HttpEntity<String> entity = new HttpEntity<>(headers);

            // Sử dụng restTemplate.exchange với URI đã được mã hóa để tránh mã hóa thêm
            ResponseEntity<String> responseEntity = restTemplate.exchange(new URI(url), HttpMethod.GET, entity, String.class);
            String response = responseEntity.getBody();

            // log.info("[BE-AI] API response: {}", response); // Đã comment/xóa

            // 3. Xử lý response
            if (response == null || response.isEmpty() || response.contains("invalid")) {
                log.error("[BE-AI] Invalid response from API or empty: {}", response);
                return null;
            }

            // Parse the actual move from response, e.g., "move:b2g2"
            String moveString = response.replace("move:", "").trim();
            if (moveString.length() != 4) {
                log.error("[BE-AI] Invalid move string length: {}", moveString);
                return null;
            }

            // 4. Chuyển đổi nước đi từ FEN sang board state mới
            String newBoardState = convertFENMoveToBoardState(boardState, moveString);
            // Lấy số lượt đi hiện tại để log (lưu ý: `moves.size()` ở đây sẽ là turn number của nước đi AI)
            List<Move> moves = moveService.getMovesByMatchId(matchId); // Lấy lại moves để có count chính xác
            int currentTurnNumber = moves.size(); // Nếu turn 0 là init, thì đây là turn hiện tại

            log.info("[BE-AI] Turn: {}, Move: {}", currentTurnNumber, moveString);

            // Các log chi tiết khác đã bị xóa/comment
            // log.info("[BE-AI] AI đi nước nào: {}, turn {}", moveString, currentTurnNumber);
            // log.info("[BE-AI] AI di chuyển (UI coords): ({},{}), ({},{})", aiFromX, 9 - aiFromY, aiToX, 9 - aiToY);
            // log.info("[BE-AI] New board state after AI move: {}", newBoardState);

            Map<String, String> result = new java.util.HashMap<>();
            result.put("fenMove", moveString);
            result.put("newBoardState", newBoardState);
            return result;
        } catch (Exception e) {
            log.error("[BE-AI] Error getting AI move: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Lấy lịch sử nước đi từ match
     */
    private String getMoveHistory(String matchId) {
        if (matchId == null) {
            log.warn("[BE-AI] matchId is null, returning empty move history");
            return "";
        }

        List<Move> moves = moveService.getMovesByMatchId(matchId);

        if (moves.isEmpty()) {
            return "";
        }

        // Bỏ qua nước đi đầu tiên (turn 0) nếu nó chỉ là trạng thái khởi tạo
        // Vì API ChessDB.cn yêu cầu FEN ban đầu và các nước đi tiếp theo
        StringBuilder moveHistory = new StringBuilder();
        for (Move move : moves) {
            if (move.getTurnNumber() == 0) {
                continue; // Bỏ qua nước đi khởi tạo nếu nó chỉ là trạng thái ban đầu
            }
            if (move.getMoveDescription() != null && !move.getMoveDescription().isEmpty()) {
                String fenMove;
                // Kiểm tra nếu moveDescription là một nước đi FEN (4 ký tự)
                if (move.getMoveDescription().length() == 4 && move.getMoveDescription().matches("[a-i][0-9][a-i][0-9]")) {
                    fenMove = move.getMoveDescription();
                } else {
                    // Nếu không phải FEN, thì cố gắng chuyển đổi từ định dạng UI
                    fenMove = convertMoveDescriptionToFEN(move.getMoveDescription());
                }

                if (fenMove != null) {
                    if (moveHistory.length() > 0) {
                        moveHistory.append(" ");
                    }
                    moveHistory.append(fenMove);
                } else {
                    log.warn("[BE-AI] Failed to convert move description to FEN for move: {}", move.getMoveDescription());
                }
            } else {
                log.warn("[BE-AI] Move description is null or empty for move: {}", move.getId());
            }
        }
        return moveHistory.toString();
    }

    /**
     * Chuyển đổi moveDescription sang định dạng FEN move
     * Ví dụ: "C 1,2 -> 2,2" -> "b2e2"
     */
    private String convertMoveDescriptionToFEN(String moveDescription) {
        log.info("[BE-AI] Converting moveDescription to FEN: {}", moveDescription);
        try {
            // Parse moveDescription format: "C 1,2 -> 2,2"
            String[] parts = moveDescription.split(" -> ");
            if (parts.length != 2) {
                log.error("[BE-AI] Invalid moveDescription format (missing ' -> '): {}", moveDescription);
                return null;
            }

            // Parse from position
            String[] fromParts = parts[0].split(" ");
            if (fromParts.length != 2) {
                log.error("[BE-AI] Invalid fromParts format (missing space): {}", parts[0]);
                return null;
            }
            String[] fromCoords = fromParts[1].split(",");
            if (fromCoords.length != 2) {
                log.error("[BE-AI] Invalid fromCoords format (missing comma): {}", fromParts[1]);
                return null;
            }
            int fromX = Integer.parseInt(fromCoords[0]);
            int fromY = Integer.parseInt(fromCoords[1]);

            // Parse to position
            String[] toCoords = parts[1].split(",");
            if (toCoords.length != 2) {
                log.error("[BE-AI] Invalid toCoords format (missing comma): {}", parts[1]);
                return null;
            }
            int toX = Integer.parseInt(toCoords[0]);
            int toY = Integer.parseInt(toCoords[1]);

            // Chuyển đổi tọa độ Y từ hệ thống của bạn (0 ở dưới cùng) sang FEN (0 ở trên cùng)
            // FEN Y = 9 - Your Y
            int fenFromY = 9 - fromY;
            int fenToY = 9 - toY;

            // Convert to FEN format (e.g., "b2e2")
            char fromCol = (char) ('a' + fromX);
            char toCol = (char) ('a' + (8 - toX));
            String fenMove = String.format("%c%d%c%d", fromCol, fenFromY, toCol, fenToY);
            return fenMove;
        } catch (Exception e) {
            log.error("[BE-AI] Error converting moveDescription to FEN: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Chuyển đổi FEN move sang board state mới
     */
    private String convertFENMoveToBoardState(String currentBoardState, String fenMove) {
        try {
            // FEN move format: "b2g2"
            if (fenMove.length() != 4) {
                log.error("[BE-AI] Invalid FEN move length: {}", fenMove);
                return null;
            }

            // Chuyển đổi tọa độ
            int fromX = 8 - (fenMove.charAt(0) - 'a');
            int fromY = '9' - fenMove.charAt(1);
            int toX = 8 - (fenMove.charAt(2) - 'a');
            int toY = '9' - fenMove.charAt(3);

            // Tạo board state mới
            char[] newBoard = currentBoardState.toCharArray();
            
            // Kiểm tra xem quân cờ có tồn tại ở vị trí bắt đầu không
            if (fromY * 9 + fromX >= newBoard.length || newBoard[fromY * 9 + fromX] == '.') {
                log.error("[BE-AI] No piece found at position ({}, {})", fromX, fromY);
                return currentBoardState;
            }

            // Lấy quân cờ và di chuyển nó
            char piece = newBoard[fromY * 9 + fromX];
            newBoard[fromY * 9 + fromX] = '.';
            newBoard[toY * 9 + toX] = piece;

            return new String(newBoard);
        } catch (Exception e) {
            log.error("[BE-AI] Error converting FEN move to board state: {}", e.getMessage());
            return currentBoardState;
        }
    }
} 