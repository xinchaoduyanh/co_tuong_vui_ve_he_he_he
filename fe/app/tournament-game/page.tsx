"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Clock, Trophy, Flag } from "lucide-react"
import Link from "next/link"
import { MatchVictoryDialog, TournamentEndDialog } from "@/components/tournament-notifications"
import { useTournamentGame } from "@/lib/api/hooks/use-tournament-game"

export default function TournamentGameBoard() {
  // State for dialogs
  const [showVictoryDialog, setShowVictoryDialog] = useState(false)
  const [showTournamentEndDialog, setShowTournamentEndDialog] = useState(false)

  const { players, pieces, currentTurn, isLoading, makeMove, tournamentInfo } = useTournamentGame()

  // For demo purposes, show victory dialog after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowVictoryDialog(true)
    }, 10000)

    return () => clearTimeout(timer)
  }, [])

  // For demo purposes, show tournament end dialog after victory dialog is closed
  useEffect(() => {
    if (!showVictoryDialog && showVictoryDialog !== undefined) {
      const timer = setTimeout(() => {
        setShowTournamentEndDialog(true)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [showVictoryDialog])

  // Function to render a piece
  const renderPiece = (piece: any) => {
    const pieceSymbols: Record<string, Record<string, string>> = {
      r: {
        G: "帥", // General
        A: "仕", // Advisor
        E: "相", // Elephant
        H: "傌", // Horse
        R: "俥", // Chariot
        C: "炮", // Cannon
        S: "兵", // Soldier
      },
      b: {
        G: "將", // General
        A: "士", // Advisor
        E: "象", // Elephant
        H: "馬", // Horse
        R: "車", // Chariot
        C: "砲", // Cannon
        S: "卒", // Soldier
      },
    }

    return (
      <div
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold border-2 ${
          piece.color === "r" ? "bg-red-100 text-red-700 border-red-500" : "bg-gray-800 text-gray-100 border-gray-600"
        } ${currentTurn === piece.color ? "ring-2 ring-yellow-400" : ""}`}
        style={{
          left: `${(piece.x * 100) / 8}%`,
          top: `${(piece.y * 100) / 9}%`,
        }}
      >
        {pieceSymbols[piece.color][piece.type]}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
        <div className="text-amber-800">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Link href="/giai-dau">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-amber-800">Cờ Tướng</h1>
          <Button variant="outline" size="sm" className="text-red-500 border-red-500">
            <Flag className="h-4 w-4 mr-1" />
            Đầu hàng
          </Button>
        </div>

        {/* Tournament info banner */}
        <div className="bg-amber-600 text-white py-2 px-4 rounded-t-lg text-center font-semibold mb-2 shadow-sm">
          Round 1 - Giải Cờ Tướng Mùa Xuân 2023
        </div>

        {/* Black player (top) */}
        <div
          className={`flex items-center justify-between p-3 rounded-t-lg ${
            currentTurn === "b" ? "bg-amber-100" : "bg-white"
          } mb-2 shadow-sm`}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-gray-300">
              <AvatarImage src="/placeholder.svg" alt={players.black.username} />
              <AvatarFallback className="bg-gray-800 text-gray-100">
                {players.black.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{players.black.username}</p>
              <div className="flex items-center text-sm text-gray-500">
                <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                <span>{players.black.points}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="font-mono">{players.black.timeLeft}</span>
          </div>
        </div>

        {/* Game board */}
        <div className="relative w-full aspect-[9/10] bg-amber-200 rounded-md shadow-md mb-2">
          {/* Board grid lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 9 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Horizontal lines */}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" y1={i} x2="8" y2={i} stroke="#8B4513" strokeWidth="0.05" />
            ))}

            {/* Vertical lines */}
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`v-${i}`} x1={i} y1="0" x2={i} y2="9" stroke="#8B4513" strokeWidth="0.05" />
            ))}

            {/* River */}
            <rect x="0" y="4" width="8" height="1" fill="#D6EAF8" fillOpacity="0.5" />
            <text x="3.5" y="4.6" fontSize="0.4" fill="#8B4513" textAnchor="middle">
              楚河
            </text>
            <text x="4.5" y="4.6" fontSize="0.4" fill="#8B4513" textAnchor="middle">
              漢界
            </text>

            {/* Palace diagonal lines (top) */}
            <line x1="3" y1="0" x2="5" y2="2" stroke="#8B4513" strokeWidth="0.05" />
            <line x1="5" y1="0" x2="3" y2="2" stroke="#8B4513" strokeWidth="0.05" />

            {/* Palace diagonal lines (bottom) */}
            <line x1="3" y1="7" x2="5" y2="9" stroke="#8B4513" strokeWidth="0.05" />
            <line x1="5" y1="7" x2="3" y2="9" stroke="#8B4513" strokeWidth="0.05" />

            {/* Position markers */}
            {[
              // Cannon positions
              [1, 2],
              [7, 2],
              [1, 7],
              [7, 7],
              // Soldier positions
              [0, 3],
              [2, 3],
              [4, 3],
              [6, 3],
              [8, 3],
              [0, 6],
              [2, 6],
              [4, 6],
              [6, 6],
              [8, 6],
            ].map(([x, y], i) => (
              <g key={`marker-${i}`}>
                {/* Top left */}
                {x > 0 && y > 0 && (
                  <path
                    d={`M${x - 0.2},${y} L${x - 0.2},${y - 0.2} L${x},${y - 0.2}`}
                    stroke="#8B4513"
                    strokeWidth="0.05"
                    fill="none"
                  />
                )}
                {/* Top right */}
                {x < 8 && y > 0 && (
                  <path
                    d={`M${x + 0.2},${y} L${x + 0.2},${y - 0.2} L${x},${y - 0.2}`}
                    stroke="#8B4513"
                    strokeWidth="0.05"
                    fill="none"
                  />
                )}
                {/* Bottom left */}
                {x > 0 && y < 9 && (
                  <path
                    d={`M${x - 0.2},${y} L${x - 0.2},${y + 0.2} L${x},${y + 0.2}`}
                    stroke="#8B4513"
                    strokeWidth="0.05"
                    fill="none"
                  />
                )}
                {/* Bottom right */}
                {x < 8 && y < 9 && (
                  <path
                    d={`M${x + 0.2},${y} L${x + 0.2},${y + 0.2} L${x},${y + 0.2}`}
                    stroke="#8B4513"
                    strokeWidth="0.05"
                    fill="none"
                  />
                )}
              </g>
            ))}
          </svg>

          {/* Pieces */}
          {pieces.map((piece, index) => (
            <div key={`piece-${index}`}>{renderPiece(piece)}</div>
          ))}
        </div>

        {/* Red player (bottom) */}
        <div
          className={`flex items-center justify-between p-3 rounded-b-lg ${
            currentTurn === "r" ? "bg-amber-100" : "bg-white"
          } shadow-sm`}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-red-400">
              <AvatarImage src="/placeholder.svg" alt={players.red.username} />
              <AvatarFallback className="bg-red-100 text-red-700">
                {players.red.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{players.red.username}</p>
              <div className="flex items-center text-sm text-gray-500">
                <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                <span>{players.red.points}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="font-mono">{players.red.timeLeft}</span>
          </div>
        </div>

        {/* Game controls */}
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm">
            Đề xuất hòa
          </Button>
          <Button variant="outline" size="sm">
            Xin đi lại
          </Button>
        </div>
      </div>

      {/* Victory Dialog */}
      <MatchVictoryDialog open={showVictoryDialog} onOpenChange={setShowVictoryDialog} />

      {/* Tournament End Dialog */}
      <TournamentEndDialog open={showTournamentEndDialog} onOpenChange={setShowTournamentEndDialog} />
    </div>
  )
}
