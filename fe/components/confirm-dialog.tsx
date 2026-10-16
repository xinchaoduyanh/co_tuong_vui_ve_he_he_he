"use client";

import { Button } from "@/components/ui/button";

// Hộp xác nhận dùng chung: đầu hàng, cầu hòa, phản hồi cầu hòa
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-dialog flex items-end justify-center bg-background/80 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-label={title}
        className="rise w-full max-w-sm rounded-lg bg-card p-6 shadow-[0_24px_60px_-20px_hsl(150_14%_3%/0.8)] ring-1 ring-border"
      >
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
