import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Logo: quân "帥" trong đĩa gỗ
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <radialGradient id="brand-disc" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#F8E9BF" />
          <stop offset="0.55" stopColor="#E5C584" />
          <stop offset="1" stopColor="#C99B55" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#brand-disc)" stroke="#8A5E2E" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="14.4" fill="none" stroke="#9A6B30" strokeOpacity="0.85" strokeWidth="1" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="central" fontSize="19" fontWeight="700" fill="#C0281B" className="font-han">
        帥
      </text>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={32} />
      <span className="font-display text-xl font-bold tracking-tight">Cờ Tướng</span>
    </span>
  );
}

// Đầu trang con: nút quay lại + tiêu đề
export function PageHeader({
  title,
  backHref = "/",
  action,
}: {
  title: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-center gap-2">
      <Button asChild variant="ghost" size="icon" aria-label="Quay lại">
        <Link href={backHref}>
          <ChevronLeft />
        </Link>
      </Button>
      <h1 className="font-display text-3xl font-bold leading-none">{title}</h1>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  );
}

// Dòng menu phẳng: icon, tiêu đề, mô tả ngắn, mũi tên
export function MenuRow({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[60px] items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-accent focus-visible:bg-accent"
    >
      <span className="text-muted-foreground transition-colors group-hover:text-foreground [&_svg]:size-5 [&_svg]:stroke-[1.75]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-tight">{title}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
