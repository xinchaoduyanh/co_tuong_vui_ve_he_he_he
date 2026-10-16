"use client";

import { BoardMenu } from "@/components/board-menu";
import { PageHeader } from "@/components/brand";

export default function ChallengeMenu() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <PageHeader title="Thách đấu" />
      <nav className="rise" aria-label="Hình thức thách đấu">
        <BoardMenu
          pieces={[
            { id: "players", href: "/thach-dau/online-players", x: 2, y: 2, side: "r", type: "C", title: "Thách đấu người chơi", hint: "Mời một người đang online" },
            { id: "tournament", href: "/giai-dau", x: 6, y: 7, side: "b", type: "R", title: "Giải đấu", hint: "Đấu theo vòng", labelSide: "left" },
          ]}
        />
      </nav>
    </div>
  );
}
