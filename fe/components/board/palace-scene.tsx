import { BoardSurface } from "@/components/board/board-surface";
import { PieceDisc } from "@/components/board/piece-disc";

// Cảnh trang trí: cung tướng đỏ bị xe đen chiếu. Cắt từ bàn cờ thật nên cùng chất liệu.
export function PalaceScene({ className }: { className?: string }) {
  return (
    <svg viewBox="1.4 -0.9 5.2 4.4" className={className} role="img" aria-label="Tướng đỏ bị xe đen chiếu">
      <BoardSurface />
      <PieceDisc x={4} y={0} color="r" type="G" />
      <PieceDisc x={3} y={0} color="r" type="A" />
      <PieceDisc x={5} y={0} color="r" type="A" />
      <PieceDisc x={4} y={2} color="b" type="R" />
      <circle cx="4" cy="0" r="0.5" fill="none" stroke="#D8432E" strokeWidth="0.07" />
    </svg>
  );
}
