"use client"

import { useState, useEffect } from "react"

// Mock player data
const mockPlayers = {
  red: {
    username: "Player1",
    points: 1250,
    timeLeft: "14:59",
  },
  black: {
    username: "ChessKing",
    points: 1720,
    timeLeft: "14:52",
  },
}

// Mock tournament info
const mockTournamentInfo = {
  name: "Giải Cờ Tướng Mùa Xuân 2023",
  round: 1,
  totalRounds: 7,
}

// Mock game state - positions of pieces on the board
const mockPieces = [
  // Red pieces (bottom)
  { type: "G", color: "r", x: 4, y: 9 }, // General
  { type: "A", color: "r", x: 3, y: 9 }, // Advisor
  { type: "A", color: "r", x: 5, y: 9 }, // Advisor
  { type: "E", color: "r", x: 2, y: 9 }, // Elephant
  { type: "E", color: "r", x: 6, y: 9 }, // Elephant
  { type: "H", color: "r", x: 1, y: 9 }, // Horse
  { type: "H", color: "r", x: 7, y: 9 }, // Horse
  { type: "R", color: "r", x: 0, y: 9 }, // Chariot
  { type: "R", color: "r", x: 8, y: 9 }, // Chariot
  { type: "C", color: "r", x: 1, y: 7 }, // Cannon
  { type: "C", color: "r", x: 7, y: 7 }, // Cannon
  { type: "S", color: "r", x: 0, y: 6 }, // Soldier
  { type: "S", color: "r", x: 2, y: 6 }, // Soldier
  { type: "S", color: "r", x: 4, y: 6 }, // Soldier
  { type: "S", color: "r", x: 6, y: 6 }, // Soldier
  { type: "S", color: "r", x: 8, y: 6 }, // Soldier

  // Black pieces (top)
  { type: "G", color: "b", x: 4, y: 0 }, // General
  { type: "A", color: "b", x: 3, y: 0 }, // Advisor
  { type: "A", color: "b", x: 5, y: 0 }, // Advisor
  { type: "E", color: "b", x: 2, y: 0 }, // Elephant
  { type: "E", color: "b", x: 6, y: 0 }, // Elephant
  { type: "H", color: "b", x: 1, y: 0 }, // Horse
  { type: "H", color: "b", x: 7, y: 0 }, // Horse
  { type: "R", color: "b", x: 0, y: 0 }, // Chariot
  { type: "R", color: "b", x: 8, y: 0 }, // Chariot
  { type: "C", color: "b", x: 1, y: 2 }, // Cannon
  { type: "C", color: "b", x: 7, y: 2 }, // Cannon
  { type: "S", color: "b", x: 0, y: 3 }, // Soldier
  { type: "S", color: "b", x: 2, y: 3 }, // Soldier
  { type: "S", color: "b", x: 4, y: 3 }, // Soldier
  { type: "S", color: "b", x: 6, y: 3 }, // Soldier
  { type: "S", color: "b", x: 8, y: 3 }, // Soldier
]

export function useTournamentGame() {
  const [players, setPlayers] = useState(mockPlayers)
  const [pieces, setPieces] = useState(mockPieces)
  const [currentTurn, setCurrentTurn] = useState("r") // r for red, b for black
  const [tournamentInfo, setTournamentInfo] = useState(mockTournamentInfo)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const getTournamentGameState = async () => {
      try {
        setIsLoading(true)
        // In a real app, this would be an API call
        // const response = await fetchTournamentGameState()
        // setPlayers(response.players)
        // setPieces(response.pieces)
        // setCurrentTurn(response.currentTurn)
        // setTournamentInfo(response.tournamentInfo)

        // Using mock data for now
        setTimeout(() => {
          setPlayers(mockPlayers)
          setPieces(mockPieces)
          setCurrentTurn("r")
          setTournamentInfo(mockTournamentInfo)
          setIsLoading(false)
        }, 500)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
        setIsLoading(false)
      }
    }

    getTournamentGameState()
  }, [])

  const makeMove = async (pieceId: number, toX: number, toY: number) => {
    try {
      // In a real app, this would be an API call
      // const response = await submitTournamentMove(pieceId, toX, toY)
      // setPlayers(response.players)
      // setPieces(response.pieces)
      // setCurrentTurn(response.currentTurn)

      // Mock implementation
      const updatedPieces = [...pieces]
      updatedPieces[pieceId] = { ...updatedPieces[pieceId], x: toX, y: toY }
      setPieces(updatedPieces)
      setCurrentTurn(currentTurn === "r" ? "b" : "r")

      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      return false
    }
  }

  return { players, pieces, currentTurn, tournamentInfo, isLoading, error, makeMove }
}
