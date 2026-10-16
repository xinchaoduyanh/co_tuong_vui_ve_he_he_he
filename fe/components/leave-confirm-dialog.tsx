"use client";

import { Button } from "@/components/ui/button";

// Hộp xác nhận khi rời trận đang diễn ra (rời là thua)
export function LeaveConfirmDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-dialog flex items-end justify-center bg-background/80 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-labelledby="leave-title"
        className="rise w-full max-w-sm rounded-lg bg-card p-6 shadow-[0_24px_60px_-20px_hsl(150_14%_3%/0.8)] ring-1 ring-border"
      >
        <h2 id="leave-title" className="font-display text-2xl font-semibold">
          Rời trận đấu?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Rời trận sẽ bị xử thua. Bạn có chắc không?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onStay}>
            Ở lại
          </Button>
          <Button onClick={onLeave}>Đồng ý rời</Button>
        </div>
      </div>
    </div>
  );
}
