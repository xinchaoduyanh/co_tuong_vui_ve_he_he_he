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
  success: "border-l-green-500",
  info: "border-l-blue-500",
  warn: "border-l-amber-500",
  error: "border-l-red-500",
};

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
      <div className="fixed top-4 right-4 z-[1000] flex w-[min(92vw,360px)] flex-col gap-3">
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
      className={`rounded-lg border border-gray-200 border-l-4 bg-white px-4 py-3 shadow-lg ${
        SEVERITY_STYLE[item.severity]
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{item.summary}</p>
          {item.detail && (
            <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
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
              className="mt-2 text-sm font-medium text-blue-700 underline"
            >
              {item.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
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
      className="rounded-lg border border-blue-200 border-l-4 border-l-blue-500 bg-white px-4 py-3 shadow-lg"
    >
      <p className="font-semibold text-blue-700">Lời mời thách đấu</p>
      <p className="mt-1 text-sm text-gray-800">
        <strong>{item.challenger}</strong> muốn thách đấu với bạn.
      </p>
      <p className="mt-1 text-right text-xs text-gray-500">
        Hết hạn sau {Math.ceil(remainingMs / 1000)}s
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
        >
          Chấp nhận
        </button>
        <button
          type="button"
          onClick={onReject}
          className="rounded bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-600"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}
