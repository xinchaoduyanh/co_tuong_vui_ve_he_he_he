// Nội dung văn hóa cờ tướng. Chỉ đưa vào những điều được ghi nhận rộng rãi;
// chỗ còn tranh luận được nói rõ là "thường được cho là".
export interface CultureFact {
  han?: string;
  title: string;
  body: string;
}

export const CULTURE_FACTS: CultureFact[] = [
  {
    han: "楚河漢界",
    title: "Sở Hà Hán Giới",
    body: "Dải sông giữa bàn cờ gợi cuộc tranh hùng Sở – Hán (206–202 TCN) giữa Hạng Vũ và Lưu Bang. Hai bên đứng hai bờ, qua sông là vào đất địch.",
  },
  {
    han: "帥仕相傌俥炮兵",
    title: "Hai bộ chữ, hai phe",
    body: "Bên đỏ viết 帥仕相傌俥炮兵, bên đen viết 將士象馬車砲卒. Cùng là Tướng, Sĩ, Tượng, Mã, Xe, Pháo, Tốt nhưng chữ khác nhau để phân biệt phe.",
  },
  {
    han: "砲",
    title: "Chữ Pháo đổi bộ",
    body: "Chữ pháo xưa viết 砲 với bộ 石 (đá), chỉ máy bắn đá. Về sau có thuốc súng, người ta dùng 炮 với bộ 火 (lửa); bàn cờ vẫn giữ cả hai dạng.",
  },
  {
    title: "Nguồn gốc còn nhiều tranh luận",
    body: "Hình thức cờ tướng gần với ngày nay thường được cho là định hình vào thời Tống, còn 'tượng kỳ' đã được nhắc từ đời Đường. Các thời xa hơn vẫn chưa có kết luận chắc chắn.",
  },
  {
    han: "蹩馬腿",
    title: "Bẻ chân Mã",
    body: "Mã đi hình chữ L nhưng bị cản nếu có quân đứng ngay sát chân theo hướng đi. Người chơi gọi đó là 'bẻ chân mã', một thế cờ rất hay gặp.",
  },
  {
    han: "過河卒",
    title: "Tốt qua sông",
    body: "Tốt chỉ được tiến, nhưng khi qua sông thì được đi ngang. Vì vậy một quân tốt qua sông đáng giá hơn nhiều so với khi còn ở nhà.",
  },
  {
    title: "Tướng đối mặt",
    body: "Hai Tướng không được đứng cùng một cột mà không có quân nào chắn giữa. Nước đi làm lộ thế đó là phạm luật; ngược lại, đôi khi nó là đòn kết thúc.",
  },
  {
    han: "觀棋不語真君子",
    title: "Xem cờ không nói",
    body: "'Quan kỳ bất ngữ chân quân tử': người xem cờ mà không chỉ điểm mới là quân tử. Câu này đi kèm 落子無悔大丈夫: đặt quân không hối hận mới là bậc trượng phu.",
  },
  {
    han: "琴棋書畫",
    title: "Cầm kỳ thư họa",
    body: "Cầm, kỳ, thư, họa là bốn thú vui thanh nhã của kẻ sĩ. Chữ 'kỳ' trong cụm này vốn chỉ cờ vây; cờ tướng là môn gần gũi với dân gian hơn.",
  },
];

export interface Proverb {
  han: string;
  vi: string;
}

export const RESULT_PROVERBS: Record<"win" | "lose" | "draw", Proverb> = {
  win: { han: "勝不驕，敗不餒", vi: "Thắng không kiêu, bại không nản." },
  lose: { han: "失敗乃成功之母", vi: "Thất bại là mẹ của thành công." },
  draw: { han: "棋逢對手", vi: "Kỳ phùng địch thủ: gặp đối thủ ngang tài." },
};

export interface PieceInfo {
  red: string;
  black: string;
  name: string;
  moves: string;
}

export const PIECES: PieceInfo[] = [
  { red: "帥", black: "將", name: "Tướng", moves: "Đi một ô ngang hoặc dọc, chỉ trong cung 3×3. Mất Tướng là thua." },
  { red: "仕", black: "士", name: "Sĩ", moves: "Đi chéo một ô, chỉ trong cung." },
  { red: "相", black: "象", name: "Tượng", moves: "Đi chéo hai ô, không được qua sông, bị cản nếu có quân ở giữa (mắt tượng)." },
  { red: "傌", black: "馬", name: "Mã", moves: "Đi một ô thẳng rồi một ô chéo; bị cản nếu có quân sát chân." },
  { red: "俥", black: "車", name: "Xe", moves: "Đi thẳng ngang hoặc dọc bao xa tùy ý, không nhảy qua quân khác." },
  { red: "炮", black: "砲", name: "Pháo", moves: "Đi như Xe, nhưng muốn ăn quân phải nhảy qua đúng một quân đứng giữa." },
  { red: "兵", black: "卒", name: "Tốt", moves: "Tiến một ô; qua sông mới được đi ngang, không bao giờ lùi." },
];
