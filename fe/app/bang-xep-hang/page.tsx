"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboard } from "@/lib/api/hooks/use-leaderboard";
import { useAuth } from "@/lib/api/context/AuthContext";
import { PlayerAvatar } from "@/components/player-avatar";
import { PageHeader } from "@/components/brand";
import { EmptyState, ListSkeleton } from "@/components/list-states";

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState("points");
  const { data: players, isLoading } = useLeaderboard();
  const { user } = useAuth();

  const rankedPlayers = (players ?? [])
    .map((player) => {
      const totalGames = player.wins + player.loses + player.draws;
      const winRate = totalGames > 0 ? (player.wins / totalGames) * 100 : 0;
      return { ...player, winRate };
    })
    .sort((a, b) => (sortBy === "points" ? b.elo - a.elo : b.winRate - a.winRate))
    .map((player, index) => ({ ...player, rank: index + 1 }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <PageHeader title="Bảng xếp hạng" />

      <Tabs value={sortBy} onValueChange={setSortBy}>
        <TabsList aria-label="Cách xếp hạng">
          <TabsTrigger value="points">Theo Elo</TabsTrigger>
          <TabsTrigger value="winRate">Theo tỉ lệ thắng</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : rankedPlayers.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu" hint="Bảng xếp hạng sẽ hiện khi có người chơi hoàn thành ván đầu tiên." />
        ) : (
          <ol className="flex flex-col">
            {rankedPlayers.map((player, i) => {
              const isMe = player.username === user?.username;
              const top = player.rank <= 3;
              return (
                <li
                  key={player.id}
                  className={`rise flex items-center gap-3 rounded-lg px-3 py-3 ${isMe ? "bg-secondary ring-1 ring-primary/50" : "hover:bg-accent/60"}`}
                  style={{ ["--i" as any]: Math.min(i, 8) }}
                >
                  <span
                    className={`tabular w-9 shrink-0 text-center font-display font-bold ${
                      top ? "text-3xl text-warning" : "text-xl text-muted-foreground"
                    }`}
                  >
                    {player.rank}
                  </span>
                  <PlayerAvatar name={player.username} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 leading-tight">
                      <span className="truncate font-medium">{player.username}</span>
                      {isMe && <span className="shrink-0 rounded-sm bg-foreground/10 px-1.5 text-xs font-medium">Bạn</span>}
                    </p>
                    <p className="tabular mt-0.5 text-xs text-muted-foreground sm:text-sm">
                      {player.wins} thắng · {player.loses} thua · {player.draws} hòa
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-display text-2xl font-semibold leading-none">
                      {sortBy === "points" ? player.elo : `${player.winRate.toFixed(0)}%`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sortBy === "points" ? "Elo" : "thắng"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
