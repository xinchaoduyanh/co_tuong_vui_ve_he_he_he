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
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black/50 p-4">
      <div role="alertdialog" className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Rời trận đấu?</h2>
        <p className="mt-2 text-gray-700">
          Rời trận sẽ bị xử THUA. Bạn có chắc không?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onStay}>
            Ở lại
          </Button>
          <Button onClick={onLeave} className="bg-red-600 text-white hover:bg-red-700">
            Đồng ý rời
          </Button>
        </div>
      </div>
    </div>
  );
}
