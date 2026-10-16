// Thang hạng kỳ thủ theo Elo, đặt theo các quân cờ: Tốt lên dần tới Tướng.
export interface Rank {
  char: string; // chữ Hán trên huy hiệu
  name: string; // tên quân bằng tiếng Việt
  title: string; // danh xưng hiển thị
  min: number; // Elo thấp nhất của hạng
  fill: string; // màu nền huy hiệu
  ring: string; // màu viền huy hiệu
}

export const RANKS: Rank[] = [
  { char: "卒", name: "Tốt", title: "Tân kỳ thủ", min: 0, fill: "#7A5C3E", ring: "#C9A27A" },
  { char: "士", name: "Sĩ", title: "Kỳ thủ hạng Sĩ", min: 1100, fill: "#6F8284", ring: "#C5D3D4" },
  { char: "象", name: "Tượng", title: "Kỳ thủ hạng Tượng", min: 1300, fill: "#3F7F6C", ring: "#9BD3BF" },
  { char: "馬", name: "Mã", title: "Kỳ thủ hạng Mã", min: 1500, fill: "#9C7428", ring: "#E8C77A" },
  { char: "砲", name: "Pháo", title: "Kỳ thủ hạng Pháo", min: 1700, fill: "#B04E26", ring: "#F0B48F" },
  { char: "車", name: "Xe", title: "Kỳ thủ hạng Xe", min: 1900, fill: "#A02A20", ring: "#F2A59B" },
  { char: "將", name: "Tướng", title: "Đại kỳ sư", min: 2100, fill: "#1E1E1E", ring: "#E3B65B" },
];

export function rankOf(elo: number | null | undefined): Rank {
  const value = typeof elo === "number" ? elo : 0;
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (value >= rank.min) current = rank;
  }
  return current;
}

// Elo còn thiếu để lên hạng kế tiếp (null nếu đã ở hạng cao nhất)
export function pointsToNextRank(elo: number): { next: Rank; missing: number } | null {
  const idx = RANKS.indexOf(rankOf(elo));
  const next = RANKS[idx + 1];
  return next ? { next, missing: next.min - elo } : null;
}
