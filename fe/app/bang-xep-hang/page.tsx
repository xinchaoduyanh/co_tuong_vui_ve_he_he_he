"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Trophy, Medal } from "lucide-react";
import Link from "next/link";
import { useLeaderboard } from "@/lib/api/hooks/use-leaderboard";

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState("points");
  const { data: players, isLoading } = useLeaderboard();

  // Calculate win rate and sort players
  const sortedPlayers = players
    ? [...players]
        .map((player) => {
          const totalGames = player.wins + player.loses + player.draws;
          const winRate = totalGames > 0 ? (player.wins / totalGames) * 100 : 0;
          return {
            ...player,
            winRate: winRate.toFixed(1),
          };
        })
        .sort((a, b) => {
          if (sortBy === "points") {
            return b.elo - a.elo;
          } else {
            return Number.parseFloat(b.winRate) - Number.parseFloat(a.winRate);
          }
        })
    : [];

  // Add rank to players
  const rankedPlayers = sortedPlayers.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-800">Bảng xếp hạng</h1>
        </div>

        <Tabs
          defaultValue="points"
          className="w-full"
          onValueChange={setSortBy}
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="points">Tổng điểm</TabsTrigger>
            <TabsTrigger value="winRate">Tỉ lệ thắng</TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Xếp hạng theo điểm</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-4">Đang tải...</div>
                ) : (
                  <div className="space-y-3">
                    {rankedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          player.username === "Player1"
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-white border border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 flex justify-center">
                            {player.rank <= 3 ? (
                              <Medal
                                className={`h-6 w-6 ${
                                  player.rank === 1
                                    ? "text-yellow-500"
                                    : player.rank === 2
                                    ? "text-gray-400"
                                    : "text-amber-600"
                                }`}
                              />
                            ) : (
                              <span className="text-gray-500 font-medium">
                                {player.rank}
                              </span>
                            )}
                          </div>
                          <Avatar className="h-10 w-10 border border-amber-300">
                            <AvatarImage
                              src="/placeholder.svg"
                              alt={player.username}
                            />
                            <AvatarFallback className="bg-amber-100 text-amber-800">
                              {player.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{player.username}</p>
                            <p className="text-xs text-gray-500">
                              {player.wins}W {player.loses}L {player.draws}D
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Trophy className="h-4 w-4 text-amber-500 mr-1" />
                          <span className="font-bold">{player.elo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="winRate" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  Xếp hạng theo tỉ lệ thắng
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-4">Đang tải...</div>
                ) : (
                  <div className="space-y-3">
                    {rankedPlayers.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          player.username === "Player1"
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-white border border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 flex justify-center">
                            {player.rank <= 3 ? (
                              <Medal
                                className={`h-6 w-6 ${
                                  player.rank === 1
                                    ? "text-yellow-500"
                                    : player.rank === 2
                                    ? "text-gray-400"
                                    : "text-amber-600"
                                }`}
                              />
                            ) : (
                              <span className="text-gray-500 font-medium">
                                {player.rank}
                              </span>
                            )}
                          </div>
                          <Avatar className="h-10 w-10 border border-amber-300">
                            <AvatarImage
                              src="/placeholder.svg"
                              alt={player.username}
                            />
                            <AvatarFallback className="bg-amber-100 text-amber-800">
                              {player.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{player.username}</p>
                            <p className="text-xs text-gray-500">
                              {player.wins}W {player.loses}L {player.draws}D
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="font-bold">{player.winRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
