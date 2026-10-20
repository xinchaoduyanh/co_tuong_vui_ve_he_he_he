"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PieceBadge } from "@/components/board/seal";
import { AI_LEVELS, useAIGame, type AiSide } from "@/lib/api/hooks/use-ai-game";

// Hộp chọn độ khó (5 mức) và bên cờ trước khi vào ván với máy
export function AiGameDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { startAIGame, isStarting, canStart } = useAIGame();
  const [level, setLevel] = useState(3);
  const [side, setSide] = useState<AiSide>("r");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isStarting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Chơi với máy</DialogTitle>
          <DialogDescription>Luyện tập, không tính điểm Elo. Mỗi ván được đi lại tối đa 3 lần.</DialogDescription>
        </DialogHeader>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Độ khó</legend>
          <RadioGroup value={String(level)} onValueChange={(v) => setLevel(Number(v))} className="gap-1.5">
            {AI_LEVELS.map((l) => (
              <Label
                key={l.level}
                htmlFor={`ai-level-${l.level}`}
                className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-md px-3 py-2 ring-1 transition-colors ${
                  level === l.level ? "bg-primary/10 ring-primary" : "ring-border hover:bg-accent"
                }`}
              >
                <RadioGroupItem id={`ai-level-${l.level}`} value={String(l.level)} />
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight">{l.name}</span>
                  <span className="block text-sm font-normal text-muted-foreground">{l.description}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Bạn cầm quân</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["r", "b"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={side === s}
                onClick={() => setSide(s)}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-md px-3 py-2 font-semibold ring-1 transition-colors ${
                  side === s ? "bg-primary/10 ring-primary" : "ring-border hover:bg-accent"
                }`}
              >
                <PieceBadge side={s} size={28} />
                {s === "r" ? "Đỏ (đi trước)" : "Đen (máy đi trước)"}
              </button>
            ))}
          </div>
        </fieldset>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isStarting}>
            Quay lại
          </Button>
          <Button onClick={() => startAIGame(level, side)} disabled={!canStart || isStarting}>
            {isStarting ? "Đang vào ván…" : "Bắt đầu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
