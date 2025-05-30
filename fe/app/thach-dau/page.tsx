"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Users, Trophy, X } from "lucide-react";
import Link from "next/link";

export default function ChallengeMenu() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-800">Thách đấu</h1>
        </div>

        <Card className="w-full bg-white/80 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="grid gap-4">
              <Link href="/thach-dau/online-players" className="w-full">
                <Button className="h-14 w-full bg-amber-600 hover:bg-amber-700 text-white flex justify-start gap-3">
                  <Users className="h-5 w-5" />
                  <span className="text-lg">Thách đấu vs người chơi</span>
                </Button>
              </Link>

              <Link href="/giai-dau" className="w-full">
                <Button className="h-14 w-full bg-amber-600 hover:bg-amber-700 text-white flex justify-start gap-3">
                  <Trophy className="h-5 w-5" />
                  <span className="text-lg">Tham gia giải đấu</span>
                </Button>
              </Link>

              <Link href="/" className="w-full">
                <Button
                  variant="outline"
                  className="h-14 w-full border-amber-600 text-amber-800 hover:bg-amber-100 flex justify-start gap-3 mt-2"
                >
                  <X className="h-5 w-5" />
                  <span className="text-lg">Thoát</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
