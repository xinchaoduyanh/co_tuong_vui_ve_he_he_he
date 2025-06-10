"use client";

import { useState, useEffect } from "react";

// Mock tournament data
const mockTournaments = [
  {
    id: 1,
    name: "Giải Cờ Tướng Mùa Xuân 2023",
    description: "Giải đấu theo thể thức Thụy Sĩ dành cho tất cả người chơi",
    startDate: "2023-05-15",
    endDate: "2023-05-30",
    status: "open", // open, ongoing, completed
    rounds: 7,
    participants: 32,
    champion: null,
  },
  {
    id: 2,
    name: "Giải Vô Địch Cờ Tướng 2023",
    description: "Giải đấu chính thức với các kỳ thủ hàng đầu",
    startDate: "2023-04-10",
    endDate: "2023-04-25",
    status: "ongoing",
    rounds: 9,
    participants: 64,
    champion: null,
  },
  {
    id: 3,
    name: "Giải Cờ Tướng Mùa Đông 2022",
    description: "Giải đấu theo thể thức Thụy Sĩ cho người chơi mọi trình độ",
    startDate: "2022-12-01",
    endDate: "2022-12-15",
    status: "completed",
    rounds: 5,
    participants: 16,
    champion: "GrandMaster88",
  },
  {
    id: 4,
    name: "Giải Cờ Tướng Giao Lưu",
    description: "Giải đấu giao lưu không tính điểm xếp hạng",
    startDate: "2023-06-01",
    endDate: "2023-06-10",
    status: "open",
    rounds: 5,
    participants: 8,
    champion: null,
  },
  {
    id: 5,
    name: "Giải Cờ Tướng Mùa Thu 2022",
    description: "Giải đấu theo thể thức Thụy Sĩ cho người chơi trung cấp",
    startDate: "2022-09-15",
    endDate: "2022-09-30",
    status: "completed",
    rounds: 7,
    participants: 32,
    champion: "ChessKing",
  },
];

export function useTournaments() {
  const [data, setData] = useState<typeof mockTournaments>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getTournaments = async () => {
      try {
        setIsLoading(true);
        // In a real app, this would be an API call
        // const response = await fetchTournaments()
        // setData(response)

        // Using mock data for now
        setTimeout(() => {
          setData(mockTournaments);
          setIsLoading(false);
        }, 500);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setIsLoading(false);
      }
    };

    getTournaments();
  }, []);

  return { data, isLoading, error };
}
