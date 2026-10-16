import type { ReactNode } from "react";
import { PalaceScene } from "@/components/board/palace-scene";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

// Khung trang đăng nhập/đăng ký: trái là cảnh cờ, phải là form (xếp một cột trên điện thoại)
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative mx-auto grid min-h-dvh w-full max-w-5xl grid-cols-1 items-center gap-10 px-5 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <div className="rise hidden lg:block">
        <Wordmark />
        <h2 className="mt-8 font-display text-5xl font-bold leading-[1.05]">
          Mỗi nước đi
          <br />
          đều có giá của nó.
        </h2>
        <p className="mt-4 max-w-sm text-muted-foreground">
          Đấu trực tuyến với người chơi thật, đồng hồ 10 phút mỗi bên, tính điểm Elo sau từng ván.
        </p>
        <PalaceScene className="mt-8 w-full max-w-md rounded-xl shadow-[0_28px_60px_-28px_hsl(150_14%_2%/0.9)]" />
      </div>
      <div className="rise mx-auto w-full max-w-sm" style={{ ["--i" as any]: 1 }}>
        <div className="mb-8 lg:hidden">
          <Wordmark />
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
