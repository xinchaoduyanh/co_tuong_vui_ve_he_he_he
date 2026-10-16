"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMatchHistory, type MatchHistoryType } from "@/lib/api/hooks/use-match-history";
import { useAuth } from "@/lib/api/context/AuthContext";
import { PlayerAvatar } from "@/components/player-avatar";
import { PageHeader } from "@/components/brand";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/list-states";

const RESULT_LABEL = { WIN: "Thắng", LOSE: "Thua", DRAW: "Hòa" } as const;
const RESULT_TONE = { WIN: "text-success", LOSE: "text-primary", DRAW: "text-warning" } as const;

function eloText(change: number) {
  return `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}`;
}

export default function MatchHistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MatchHistoryType>("recent");
  const { data: matches, isLoading, error } = useMatchHistory(user?.username ?? null, activeTab);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <PageHeader title="Lịch sử đấu" />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MatchHistoryType)}>
        <TabsList aria-label="Bộ lọc lịch sử">
          <TabsTrigger value="recent">Gần đây</TabsTrigger>
          <TabsTrigger value="opponent-rank">Đối thủ rank cao</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {!user ? (
          <EmptyState
            title="Chưa đăng nhập"
            hint="Đăng nhập để xem các ván bạn đã đấu."
            action={
              <Button asChild>
                <Link href="/login">Đăng nhập</Link>
              </Button>
            }
          />
        ) : isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : matches.length === 0 ? (
          <EmptyState
            title="Chưa có ván nào"
            hint="Các ván bạn đấu xong sẽ hiện ở đây cùng điểm Elo thay đổi."
            action={
              <Button asChild>
                <Link href="/thach-dau">Tìm đối thủ</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col">
            {matches.map((match, i) => (
              <li
                key={match.id}
                className="rise flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent/60"
                style={{ ["--i" as any]: Math.min(i, 8) }}
              >
                <PlayerAvatar name={match.opponent.username} className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold leading-tight ${RESULT_TONE[match.result]}`}>
                    {RESULT_LABEL[match.result]}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    vs {match.opponent.username}
                    {typeof match.opponent.elo === "number" && (
                      <span className="tabular"> · Elo {match.opponent.elo}</span>
                    )}
                  </p>
                </div>
                <span className={`tabular font-display text-2xl font-semibold ${RESULT_TONE[match.result]}`}>
                  {eloText(match.eloChange)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
