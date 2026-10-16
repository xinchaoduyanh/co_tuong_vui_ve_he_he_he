"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Sáu tông trầm cùng họ với bảng màu; màu chọn theo tên nên mỗi người luôn một màu
const TONES = [
  ["12 40% 28%", "30 60% 85%"],
  ["160 30% 24%", "150 40% 85%"],
  ["200 28% 28%", "195 45% 88%"],
  ["40 38% 26%", "42 60% 86%"],
  ["280 18% 30%", "280 30% 88%"],
  ["350 30% 30%", "350 45% 88%"],
];

function toneOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function PlayerAvatar({
  name,
  className,
  ringColor,
}: {
  name?: string | null;
  className?: string;
  ringColor?: string;
}) {
  const label = (name || "??").trim();
  const [bg, fg] = toneOf(label);
  return (
    <Avatar
      className={cn("h-10 w-10", className)}
      style={ringColor ? { boxShadow: `0 0 0 2px ${ringColor}` } : undefined}
    >
      <AvatarFallback style={{ backgroundColor: `hsl(${bg})`, color: `hsl(${fg})` }}>
        {label.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
