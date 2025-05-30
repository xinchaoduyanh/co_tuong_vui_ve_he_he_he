package com.chessxiangqi.xiangqi_backend.util;

import java.util.HashMap;
import java.util.Map;

public class BoardChecker {
  // Hàm kiểm tra trạng thái chiếu
  public static Map<String, Boolean> checkBoardState(String boardState) {
      Map<String, Boolean> result = new HashMap<>();
      result.put("redCheck", false);
      result.put("blackCheck", false);
      
      // Tìm vị trí tướng đỏ và đen
      int redKingX = -1, redKingY = -1;
      int blackKingX = -1, blackKingY = -1;
      
      // Duyệt qua bàn cờ để tìm vị trí tướng
      for (int i = 0; i < boardState.length(); i++) {
          char piece = boardState.charAt(i);
          int x = i % 9;
          int y = i / 9;
          
          if (piece == 'k') { // Tướng đỏ
              redKingX = x;
              redKingY = y;
          } else if (piece == 'K') { // Tướng đen
              blackKingX = x;
              blackKingY = y;
          }
      }
      
      // Kiểm tra xem tướng đỏ có bị chiếu không
      result.put("redCheck", isKingInCheck(boardState, redKingX, redKingY, 'k'));
      
      // Kiểm tra xem tướng đen có bị chiếu không
      result.put("blackCheck", isKingInCheck(boardState, blackKingX, blackKingY, 'K'));
      
      return result;
  }
  
  // Hàm kiểm tra xem tướng có bị chiếu không
  private static boolean isKingInCheck(String boardState, int kingX, int kingY, char kingType) {
      // Duyệt qua tất cả các quân cờ
      for (int i = 0; i < boardState.length(); i++) {
          char piece = boardState.charAt(i);
          int x = i % 9;
          int y = i / 9;
          
          // Bỏ qua ô trống và quân cùng màu
          if (piece == '.' || (Character.isUpperCase(piece) == Character.isUpperCase(kingType))) {
              continue;
          }
          
          // Kiểm tra xem quân cờ có thể ăn tướng không
          if (canCaptureKing(boardState, x, y, kingX, kingY, piece)) {
              return true;
          }
      }
      return false;
  }
  
  // Hàm kiểm tra xem một quân có thể ăn tướng không
  private static boolean canCaptureKing(String boardState, int fromX, int fromY, int kingX, int kingY, char piece) {
      // Chuyển đổi ký tự quân cờ thành chữ thường để dễ xử lý
      char pieceType = Character.toLowerCase(piece);
      
      switch (pieceType) {
          case 'r': // Xe
              return canRookCapture(fromX, fromY, kingX, kingY, boardState);
          case 'h': // Mã
              return canHorseCapture(fromX, fromY, kingX, kingY, boardState);
          case 'e': // Tượng
              return canElephantCapture(fromX, fromY, kingX, kingY, boardState);
          case 'a': // Sĩ
              return canAdvisorCapture(fromX, fromY, kingX, kingY, boardState);
          case 'k': // Tướng
              return canKingCapture(fromX, fromY, kingX, kingY, boardState);
          case 'c': // Pháo
              return canCannonCapture(fromX, fromY, kingX, kingY, boardState);
          case 'p': // Tốt
              return canPawnCapture(fromX, fromY, kingX, kingY, boardState);
          default:
              return false;
      }
  }
  
  // Các hàm kiểm tra cho từng loại quân
  private static boolean canRookCapture(int fromX, int fromY, int kingX, int kingY, String boardState) {
      // Xe chỉ đi thẳng
      if (fromX != kingX && fromY != kingY) return false;
      
      // Kiểm tra có quân nào ở giữa không
      if (fromX == kingX) {
          int minY = Math.min(fromY, kingY);
          int maxY = Math.max(fromY, kingY);
          for (int y = minY + 1; y < maxY; y++) {
              if (boardState.charAt(y * 9 + fromX) != '.') return false;
          }
      } else {
          int minX = Math.min(fromX, kingX);
          int maxX = Math.max(fromX, kingX);
          for (int x = minX + 1; x < maxX; x++) {
              if (boardState.charAt(fromY * 9 + x) != '.') return false;
          }
      }
      return true;
  }
  
  private static boolean canHorseCapture(int fromX, int fromY, int kingX, int kingY, String boardState) {
      // Mã đi theo hình chữ L
      int dx = Math.abs(kingX - fromX);
      int dy = Math.abs(kingY - fromY);
      if (!((dx == 1 && dy == 2) || (dx == 2 && dy == 1))) return false;
      
      // Kiểm tra điểm chân ngựa
      int blockX = fromX;
      int blockY = fromY;
      if (dx == 1) {
          blockY = fromY + (kingY > fromY ? 1 : -1);
      } else {
          blockX = fromX + (kingX > fromX ? 1 : -1);
      }
      return boardState.charAt(blockY * 9 + blockX) == '.';
  }
  
  private static boolean canElephantCapture(int fromX, int fromY, int kingX, int kingY, String boardState) {
      // Tượng đi chéo 2 ô
      int dx = Math.abs(kingX - fromX);
      int dy = Math.abs(kingY - fromY);
      if (dx != 2 || dy != 2) return false;
      
      // Kiểm tra điểm giữa
      int midX = (fromX + kingX) / 2;
      int midY = (fromY + kingY) / 2;
      return boardState.charAt(midY * 9 + midX) == '.';
  }
  
  private static boolean canAdvisorCapture(int fromX, int fromY, int kingX, int kingY, String boardState) {
      // Sĩ đi chéo 1 ô trong cung
      int dx = Math.abs(kingX - fromX);
      int dy = Math.abs(kingY - fromY);
      return dx == 1 && dy == 1;
  }
  
  private static boolean canKingCapture(int fromX, int fromY, int kingX, int kingY, String boardState) {
      // Tướng đi 1 ô theo chiều ngang hoặc dọc trong cung
      int dx = Math.abs(kingX - fromX);
      int dy = Math.abs(kingY - fromY);
      return (dx == 1 && dy == 0) || (dx == 0 && dy == 1);
  }
  
  private static boolean canCannonCapture(int fromX, int fromY, int kingX, int kingY, String boardState) {
      // Pháo đi thẳng, ăn quân phải nhảy qua 1 quân
      if (fromX != kingX && fromY != kingY) return false;
      
      int piecesBetween = 0;
      if (fromX == kingX) {
          int minY = Math.min(fromY, kingY);
          int maxY = Math.max(fromY, kingY);
          for (int y = minY + 1; y < maxY; y++) {
              if (boardState.charAt(y * 9 + fromX) != '.') piecesBetween++;
          }
      } else {
          int minX = Math.min(fromX, kingX);
          int maxX = Math.max(fromX, kingX);
          for (int x = minX + 1; x < maxX; x++) {
              if (boardState.charAt(fromY * 9 + x) != '.') piecesBetween++;
          }
      }
      return piecesBetween == 1;
  }
  
  private static boolean canPawnCapture(int fromX, int fromY, int kingX, int kingY, String boardState) {
      // Tốt đi 1 ô theo chiều ngang hoặc dọc
      int dx = Math.abs(kingX - fromX);
      int dy = Math.abs(kingY - fromY);
      return (dx == 1 && dy == 0) || (dx == 0 && dy == 1);
  }
}