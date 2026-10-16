"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Lớp thông báo dùng chung: thông báo thường và lời mời thách đấu (có đếm lùi hiển thị)
export type NotificationSeverity = "success" | "info" | "warn" | "error";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationOptions {
  severity: NotificationSeverity;
  summary: string;
  detail?: string;
  // Thời gian hiển thị (ms); 0 nghĩa là giữ đến khi người dùng đóng
  life?: number;
  action?: NotificationAction;
}

interface NotificationItem extends NotificationOptions {
  id: string;
}

interface ChallengeItem {
  id: string;
  challenger: string;
  expiresAt: number;
  onAccept: (challenger: string) => void;
  onReject: (challenger: string) => void;
}

interface NotificationContextType {
  showNotification: (options: NotificationOptions) => string;
  dismissNotification: (id: string) => void;
  showChallengeDialog: (
    challenger: string,
    onAccept: (challenger: string) => void,
    onReject: (challenger: string) => void,
    timeoutMs?: number
  ) => void;
  // Đóng lời mời của một người (khi server báo đã hủy hoặc hết hạn)
  dismissChallengeDialog: (challenger: string) => void;
}

const DEFAULT_LIFE_MS = 4000;
const DEFAULT_CHALLENGE_TIMEOUT_MS = 8000;

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

const SEVERITY_STYLE: Record<NotificationSeverity, string> = {
  success: "border-l-success",
  info: "border-l-muted-foreground",
  warn: "border-l-warning",
  error: "border-l-primary",
};

const CARD_SHADOW = "shadow-[0_10px_32px_-10px_hsl(150_14%_3%/0.6)]";

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const counter = useRef(0);

  const dismissNotification = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      counter.current += 1;
      const id = `n-${counter.current}`;
      setItems((prev) => [...prev, { ...options, id }]);
      const life = options.life ?? DEFAULT_LIFE_MS;
      if (life > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismissNotification(id), life)
        );
      }
      return id;
    },
    [dismissNotification]
  );

  const showChallengeDialog = useCallback(
    (
      challenger: string,
      onAccept: (challenger: string) => void,
      onReject: (challenger: string) => void,
      timeoutMs: number = DEFAULT_CHALLENGE_TIMEOUT_MS
    ) => {
      counter.current += 1;
      const id = `c-${counter.current}`;
      // Chỉ hiển thị đếm lùi; server quyết định hết hạn và sẽ báo lại
      setChallenges((prev) => [
        ...prev.filter((c) => c.challenger !== challenger),
        { id, challenger, expiresAt: Date.now() + timeoutMs, onAccept, onReject },
      ]);
    },
    []
  );

  const dismissChallengeDialog = useCallback((challenger: string) => {
    setChallenges((prev) => prev.filter((c) => c.challenger !== challenger));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const respondChallenge = (
    item: ChallengeItem,
    handler: (challenger: string) => void
  ) => {
    setChallenges((prev) => prev.filter((c) => c.id !== item.id));
    handler(item.challenger);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        dismissNotification,
        showChallengeDialog,
        dismissChallengeDialog,
      }}
    >
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-toast flex w-[min(94vw,380px)] flex-col gap-2.5 sm:right-4 sm:top-4 [&>*]:pointer-events-auto">
        {challenges.map((item) => (
          <ChallengeCard
            key={item.id}
            item={item}
            onAccept={() => respondChallenge(item, item.onAccept)}
            onReject={() => respondChallenge(item, item.onReject)}
            onExpire={() =>
              setChallenges((prev) => prev.filter((c) => c.id !== item.id))
            }
          />
        ))}
        {items.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            onClose={() => dismissNotification(item.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

function NotificationCard({
  item,
  onClose,
}: {
  item: NotificationItem;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className={`rise rounded-md border-l-[3px] bg-card px-4 py-3 text-card-foreground ${CARD_SHADOW} ${
        SEVERITY_STYLE[item.severity]
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{item.summary}</p>
          {item.detail && (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {item.detail}
            </p>
          )}
          {item.action && (
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                onClose();
              }}
              className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {item.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function ChallengeCard({
  item,
  onAccept,
  onReject,
  onExpire,
}: {
  item: ChallengeItem;
  onAccept: () => void;
  onReject: () => void;
  onExpire: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, item.expiresAt - Date.now())
  );
  const [totalMs] = useState(Math.max(1, item.expiresAt - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, item.expiresAt - Date.now());
      setRemainingMs(left);
      if (left === 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 200);
    return () => clearInterval(timer);
    // onExpire được tạo lại mỗi lần render, chỉ cần theo dõi mốc hết hạn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.expiresAt]);

  return (
    <div
      role="alertdialog"
      className={`rise overflow-hidden rounded-md bg-card text-card-foreground ring-1 ring-primary/50 ${CARD_SHADOW}`}
    >
      <div className="px-4 pb-3 pt-4">
        <p className="text-sm text-muted-foreground">Lời mời thách đấu</p>
        <p className="mt-0.5 font-display text-xl font-semibold leading-tight">
          {item.challenger}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          muốn đấu một ván với bạn · còn{" "}
          <span className="tabular text-foreground">{Math.ceil(remainingMs / 1000)}s</span>
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="h-11 flex-1 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[background-color,transform] hover:bg-primary/88 active:scale-[0.98]"
          >
            Chấp nhận
          </button>
          <button
            type="button"
            onClick={onReject}
            className="h-11 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Từ chối
          </button>
        </div>
      </div>
      <div className="h-1 bg-secondary" aria-hidden>
        <div
          className="h-full origin-left bg-primary"
          style={{
            transform: `scaleX(${remainingMs / totalMs})`,
            transition: "transform 200ms linear",
          }}
        />
      </div>
    </div>
  );
}
