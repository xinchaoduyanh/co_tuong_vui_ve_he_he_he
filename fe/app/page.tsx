"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Swords, Monitor, History, BarChart3, LogOut, ScrollText } from "lucide-react";
import Link from "next/link";
import { handleLogout } from "@/lib/api/context/AuthContext";
import { User } from "@/lib/types/user";
import { useActiveMatch } from "@/lib/api/hooks/use-active-match";
import { PlayerAvatar } from "@/components/player-avatar";
import { MenuRow, Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { CultureCard } from "@/components/culture-card";
import { RankBadge } from "@/components/rank-badge";

export default function Home() {
  const router = useRouter();
  const activeMatch = useActiveMatch();
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

  const playHref = activeMatch ? `/game-board?matchId=${activeMatch.matchId}` : "/thach-dau";
  const stats: Array<[string, number]> = [
    ["Thắng", user.wins],
    ["Thua", user.loses],
    ["Hòa", user.draws],
    ["Tổng trận", user.totalMatches],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <header className="rise flex items-center justify-between" style={{ ["--i" as any]: 0 }}>
        <Wordmark />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut />
            Thoát
          </Button>
        </div>
      </header>

      <section className="rise mt-10 flex items-end justify-between gap-4" style={{ ["--i" as any]: 1 }}>
        <div className="flex min-w-0 items-center gap-4">
          <PlayerAvatar name={user.username} className="h-14 w-14 shrink-0 text-lg" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Xin chào</p>
            <h1 className="truncate font-display text-3xl font-bold leading-tight">{user.username}</h1>
            <p className="mt-1 text-sm text-muted-foreground"><RankBadge elo={user.elo} /></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Elo</p>
          <p className="tabular font-display text-5xl font-bold leading-none">{user.elo}</p>
        </div>
      </section>

      <dl className="rise mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-lg bg-border" style={{ ["--i" as any]: 2 }}>
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="tabular mt-0.5 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <Button asChild size="lg" className="rise mt-8 w-full justify-between" style={{ ["--i" as any]: 3 }}>
        <Link href={playHref}>
          <span>{activeMatch ? `Vào lại trận với ${activeMatch.opponent}` : "Thách đấu người chơi"}</span>
          <Swords />
        </Link>
      </Button>

      <nav className="rise mt-4 flex flex-col" aria-label="Chức năng" style={{ ["--i" as any]: 4 }}>
        <MenuRow
          href={activeMatch ? playHref : "/ai-game-board"}
          icon={<Monitor />}
          title={activeMatch ? "Vào lại trận đang chơi" : "Chơi với máy"}
          hint={activeMatch ? "Hoàn thành ván hiện tại trước khi tìm ván khác" : "Luyện tập không ảnh hưởng điểm"}
        />
        <MenuRow href="/lich-su-dau" icon={<History />} title="Lịch sử đấu" hint="Các ván gần đây và điểm Elo" />
        <MenuRow href="/bang-xep-hang" icon={<BarChart3 />} title="Bảng xếp hạng" hint="Theo Elo và tỉ lệ thắng" />
        <MenuRow href="/van-hoa" icon={<ScrollText />} title="Văn hóa cờ tướng" hint="Các quân, cổ tích và lời răn nhà cờ" />
      </nav>

      <CultureCard className="rise mt-10" />
    </div>
  );
}
