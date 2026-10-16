// Xóa bản sao trạng thái trận trong localStorage sau khi trận kết thúc.
// Nguồn sự thật là server; lỗi truy cập storage (bị chặn) được bỏ qua.
const MATCH_KEYS = ["matchId", "player1", "player2", "currentTurn", "initialBoardState"];

export function clearMatchStorage() {
  try {
    MATCH_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage không khả dụng: không có gì để dọn
  }
}
