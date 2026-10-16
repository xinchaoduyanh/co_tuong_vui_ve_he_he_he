"use client";

import { Users, Trophy } from "lucide-react";
import { MenuRow, PageHeader } from "@/components/brand";

export default function ChallengeMenu() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <PageHeader title="Thách đấu" />
      <nav className="rise flex flex-col" aria-label="Hình thức thách đấu">
        <MenuRow
          href="/thach-dau/online-players"
          icon={<Users />}
          title="Thách đấu người chơi"
          hint="Chọn một người đang online và gửi lời mời"
        />
        <MenuRow
          href="/giai-dau"
          icon={<Trophy />}
          title="Tham gia giải đấu"
          hint="Đấu theo vòng với nhiều người chơi"
        />
      </nav>
    </div>
  );
}
