import { useState } from "react";

export type Piece = {
  type: string; // G, A, E, H, R, C, S
  color: "r" | "b";
  x: number;
  y: number;
};

// Hàm kiểm tra xem có quân nào ở vị trí (x,y) không
function getPieceAt(x: number, y: number, pieces: Piece[]): Piece | undefined {
  return pieces.find((p) => p.x === x && p.y === y);
}

// Hàm kiểm tra xem có quân nào ở giữa 2 điểm không (dùng cho Xe và Pháo)
function hasPieceBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pieces: Piece[]
): boolean {
  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY + 1; y < maxY; y++) {
      if (getPieceAt(x1, y, pieces)) return true;
    }
  } else if (y1 === y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX + 1; x < maxX; x++) {
      if (getPieceAt(x, y1, pieces)) return true;
    }
  }
  return false;
}

function countPiecesBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pieces: Piece[]
): number {
  let count = 0;
  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY + 1; y < maxY; y++) {
      if (getPieceAt(x1, y, pieces)) count++;
    }
  } else if (y1 === y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX + 1; x < maxX; x++) {
      if (getPieceAt(x, y1, pieces)) count++;
    }
  }
  return count;
}

export function useBoardLogic(pieces: Piece[], myColor: "r" | "b") {
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<{ x: number; y: number }[]>([]);

  console.log("[DEBUG] pieces before useBoardLogic:", pieces);

  function getValidMoves(
    piece: Piece,
    allPieces: Piece[]
  ): { x: number; y: number }[] {
    const moves: { x: number; y: number }[] = [];
    const isRed = piece.color === "r";
    // Cung cho mỗi bên
    const palaceX = [3, 4, 5];
    const palaceY = isRed ? [0, 1, 2] : [7, 8, 9];

    switch (piece.type) {
      case "G": // Tướng
        const gDirections = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];
        for (const dir of gDirections) {
          const nx = piece.x + dir.dx;
          const ny = piece.y + dir.dy;
          if (palaceX.includes(nx) && palaceY.includes(ny)) {
            const targetPiece = getPieceAt(nx, ny, allPieces);
            if (!targetPiece || targetPiece.color !== piece.color) {
              moves.push({ x: nx, y: ny });
            }
          }
        }
        break;

      case "A": // Sĩ
        const aDirections = [
          { dx: 1, dy: 1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: -1 },
        ];
        const palaceX_A = [3, 4, 5];
        const palaceY_A = isRed ? [0, 1, 2] : [7, 8, 9];
        for (const dir of aDirections) {
          const nx = piece.x + dir.dx;
          const ny = piece.y + dir.dy;
          if (palaceX_A.includes(nx) && palaceY_A.includes(ny)) {
            const targetPiece = getPieceAt(nx, ny, allPieces);
            if (!targetPiece || targetPiece.color !== piece.color) {
              moves.push({ x: nx, y: ny });
            }
          }
        }
        break;

      case "E": // Tượng
        const eDirections = [
          { dx: 2, dy: 2 },
          { dx: -2, dy: 2 },
          { dx: 2, dy: -2 },
          { dx: -2, dy: -2 },
        ];
        for (const dir of eDirections) {
          const nx = piece.x + dir.dx;
          const ny = piece.y + dir.dy;
          // Đỏ chỉ đi trong nửa trên (y <= 4), Đen chỉ đi trong nửa dưới (y >= 5)
          if ((isRed && ny >= 0 && ny <= 4) || (!isRed && ny >= 5 && ny <= 9)) {
            // Kiểm tra "mắt tượng" không bị chặn
            const midX = piece.x + dir.dx / 2;
            const midY = piece.y + dir.dy / 2;
            if (!getPieceAt(midX, midY, allPieces)) {
              const targetPiece = getPieceAt(nx, ny, allPieces);
              if (!targetPiece || targetPiece.color !== piece.color) {
                moves.push({ x: nx, y: ny });
              }
            }
          }
        }
        break;

      case "H": // Mã
        // Mã đi theo hình chữ L
        const hMoves = [
          { dx: 2, dy: 1, blockX: 1, blockY: 0 },
          { dx: 2, dy: -1, blockX: 1, blockY: 0 },
          { dx: -2, dy: 1, blockX: -1, blockY: 0 },
          { dx: -2, dy: -1, blockX: -1, blockY: 0 },
          { dx: 1, dy: 2, blockX: 0, blockY: 1 },
          { dx: 1, dy: -2, blockX: 0, blockY: -1 },
          { dx: -1, dy: 2, blockX: 0, blockY: 1 },
          { dx: -1, dy: -2, blockX: 0, blockY: -1 },
        ];
        for (const move of hMoves) {
          const nx = piece.x + move.dx;
          const ny = piece.y + move.dy;
          if (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
            // Kiểm tra điểm chân ngựa không bị chặn
            if (
              !getPieceAt(
                piece.x + move.blockX,
                piece.y + move.blockY,
                allPieces
              )
            ) {
              const targetPiece = getPieceAt(nx, ny, allPieces);
              if (!targetPiece || targetPiece.color !== piece.color) {
                moves.push({ x: nx, y: ny });
              }
            }
          }
        }
        break;

      case "R": // Xe
        // Sang phải
        for (let x = piece.x + 1; x <= 8; x++) {
          const target = getPieceAt(x, piece.y, allPieces);
          if (!target) {
            moves.push({ x, y: piece.y });
          } else {
            if (target.color !== piece.color) moves.push({ x, y: piece.y });
            break;
          }
        }
        // Sang trái
        for (let x = piece.x - 1; x >= 0; x--) {
          const target = getPieceAt(x, piece.y, allPieces);
          if (!target) {
            moves.push({ x, y: piece.y });
          } else {
            if (target.color !== piece.color) moves.push({ x, y: piece.y });
            break;
          }
        }
        // Xuống
        for (let y = piece.y + 1; y <= 9; y++) {
          console.log("[DEBUG] Xe moves, allPieces:", allPieces);
          const target = getPieceAt(piece.x, y, allPieces);
          console.log("Xe check:", piece.x, y, "target:", target);
          if (!target) {
            moves.push({ x: piece.x, y });
          } else {
            if (target.color !== piece.color) moves.push({ x: piece.x, y });
            break;
          }
        }
        // Lên
        for (let y = piece.y - 1; y >= 0; y--) {
          const target = getPieceAt(piece.x, y, allPieces);
          if (!target) {
            moves.push({ x: piece.x, y });
          } else {
            if (target.color !== piece.color) moves.push({ x: piece.x, y });
            break;
          }
        }
        break;

      case "C": // Pháo
        // Pháo đi thẳng, ăn quân phải nhảy qua 1 quân
        // Sang phải
        let found = false;
        for (let x = piece.x + 1; x <= 8; x++) {
          const target = getPieceAt(x, piece.y, allPieces);
          if (!found) {
            if (!target) {
              moves.push({ x, y: piece.y });
            } else {
              found = true;
            }
          } else {
            if (target) {
              if (target.color !== piece.color) moves.push({ x, y: piece.y });
              break;
            }
          }
        }
        // Sang trái
        found = false;
        for (let x = piece.x - 1; x >= 0; x--) {
          const target = getPieceAt(x, piece.y, allPieces);
          if (!found) {
            if (!target) {
              moves.push({ x, y: piece.y });
            } else {
              found = true;
            }
          } else {
            if (target) {
              if (target.color !== piece.color) moves.push({ x, y: piece.y });
              break;
            }
          }
        }
        // Xuống
        found = false;
        for (let y = piece.y + 1; y <= 9; y++) {
          const target = getPieceAt(piece.x, y, allPieces);
          if (!found) {
            if (!target) {
              moves.push({ x: piece.x, y });
            } else {
              found = true;
            }
          } else {
            if (target) {
              if (target.color !== piece.color) moves.push({ x: piece.x, y });
              break;
            }
          }
        }
        // Lên
        found = false;
        for (let y = piece.y - 1; y >= 0; y--) {
          const target = getPieceAt(piece.x, y, allPieces);
          if (!found) {
            if (!target) {
              moves.push({ x: piece.x, y });
            } else {
              found = true;
            }
          } else {
            if (target) {
              if (target.color !== piece.color) moves.push({ x: piece.x, y });
              break;
            }
          }
        }
        break;

      case "S": // Tốt
        // Tốt chỉ được đi tiến (về phía đối phương), sau khi qua sông mới được đi ngang, không bao giờ được đi lùi
        if (isRed) {
          // Đỏ đi xuống (y tăng)
          if (piece.y < 9) {
            // Tiến xuống
            const target = getPieceAt(piece.x, piece.y + 1, allPieces);
            if (!target || target.color !== piece.color) {
              moves.push({ x: piece.x, y: piece.y + 1 });
            }
          }
          // Sau khi qua sông (y >= 5) mới được đi ngang
          if (piece.y >= 5) {
            if (piece.x > 0) {
              const target = getPieceAt(piece.x - 1, piece.y, allPieces);
              if (!target || target.color !== piece.color) {
                moves.push({ x: piece.x - 1, y: piece.y });
              }
            }
            if (piece.x < 8) {
              const target = getPieceAt(piece.x + 1, piece.y, allPieces);
              if (!target || target.color !== piece.color) {
                moves.push({ x: piece.x + 1, y: piece.y });
              }
            }
          }
        } else {
          // Đen đi lên (y giảm)
          if (piece.y > 0) {
            // Tiến lên
            const target = getPieceAt(piece.x, piece.y - 1, allPieces);
            if (!target || target.color !== piece.color) {
              moves.push({ x: piece.x, y: piece.y - 1 });
            }
          }
          // Sau khi qua sông (y <= 4) mới được đi ngang
          if (piece.y <= 4) {
            if (piece.x > 0) {
              const target = getPieceAt(piece.x - 1, piece.y, allPieces);
              if (!target || target.color !== piece.color) {
                moves.push({ x: piece.x - 1, y: piece.y });
              }
            }
            if (piece.x < 8) {
              const target = getPieceAt(piece.x + 1, piece.y, allPieces);
              if (!target || target.color !== piece.color) {
                moves.push({ x: piece.x + 1, y: piece.y });
              }
            }
          }
        }
        break;
    }

    return moves;
  }

  function handleSelectPiece(piece: Piece) {
    if (piece.color !== myColor) return;
    setSelectedPiece(piece);
    setValidMoves(getValidMoves(piece, pieces));
  }

  function handleMoveTo(x: number, y: number) {
    if (!selectedPiece) return;
    if (!validMoves.some((m) => m.x === x && m.y === y)) return;
    // Không cập nhật pieces ở đây nữa, chỉ reset selection
    setSelectedPiece(null);
    setValidMoves([]);
  }

  function resetSelection() {
    setSelectedPiece(null);
    setValidMoves([]);
  }

  return {
    selectedPiece,
    validMoves,
    handleSelectPiece,
    handleMoveTo,
    resetSelection,
  };
}
