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

// Chữ cái đầu + số ở cuối (player2 -> P2), nếu không có số thì lấy hai chữ đầu
function initialsOf(name: string) {
  const last = name.slice(-1);
  const text = /\d/.test(last) && name.length > 1 ? name[0] + last : name.substring(0, 2);
  return text.toUpperCase();
}

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
        {initialsOf(label)}
      </AvatarFallback>
    </Avatar>
  );
}
