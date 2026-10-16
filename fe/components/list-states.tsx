import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

// Khung xương theo đúng hình dòng danh sách, thay cho spinner
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-11 w-11 rounded-[10px]" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <p className="font-display text-2xl font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-muted-foreground">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg bg-card px-4 py-6 text-center">
      <p className="font-medium text-primary">Không tải được dữ liệu</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
