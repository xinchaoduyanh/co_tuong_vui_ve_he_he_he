"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Users,
  Monitor,
  History,
  BarChart3,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { handleLogout } from "@/lib/api/context/AuthContext";
import { User } from "@/lib/types/user";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      router.push("/login");
    }
  }, []);

  if (!user) return null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4">
      {/* User info section */}
      <div className="w-full max-w-md flex items-center justify-between bg-white rounded-lg p-4 shadow-md mb-8">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-amber-500">
            <AvatarImage src="/placeholder.svg" alt={user.username} />
            <AvatarFallback className="bg-amber-200 text-amber-800">
              {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-bold text-lg">{user.username}</h2>
            <p className="text-sm text-gray-600">Elo: {user.elo}</p>
            <p className="text-sm text-gray-600">
              Thắng: {user.wins} | Thua: {user.loses} | Hòa: {user.draws}
            </p>
            <p className="text-sm text-gray-600">
              Tổng số trận: {user.totalMatches}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="h-5 w-5 text-amber-500" />
          <span className="font-semibold">{user.elo}</span>
        </div>
      </div>

      {/* Game title */}
      <h1 className="text-3xl font-bold text-amber-800 mb-8">Cờ Tướng</h1>

      {/* Menu options */}
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-lg">
        <CardContent className="p-6">
          <div className="grid gap-4">
            <Link href="/thach-dau" className="w-full">
              <Button className="h-14 w-full bg-amber-600 hover:bg-amber-700 text-white flex justify-start gap-3">
                <Users className="h-5 w-5" />
                <span className="text-lg">Thách đấu</span>
              </Button>
            </Link>

            <Link href="/ai-game-board" className="w-full">
              <Button className="h-14 w-full bg-amber-600 hover:bg-amber-700 text-white flex justify-start gap-3">
                <Monitor className="h-5 w-5" />
                <span className="text-lg">Chơi với máy</span>
              </Button>
            </Link>

            <Link href="/lich-su-dau" className="w-full">
              <Button className="h-14 w-full bg-amber-600 hover:bg-amber-700 text-white flex justify-start gap-3">
                <History className="h-5 w-5" />
                <span className="text-lg">Lịch sử đấu</span>
              </Button>
            </Link>

            <Link href="/bang-xep-hang" className="w-full">
              <Button className="h-14 w-full bg-amber-600 hover:bg-amber-700 text-white flex justify-start gap-3">
                <BarChart3 className="h-5 w-5" />
                <span className="text-lg">Bảng xếp hạng</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              className="h-14 border-amber-600 text-amber-800 hover:bg-amber-100 flex justify-start gap-3 mt-2"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-lg">Thoát</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
