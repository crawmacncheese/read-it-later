"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Toast = {
  id: string;
  title: string;
  message?: string;
  variant?: "success" | "error" | "info";
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { ...t, id }]);
      window.setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-md border border-[var(--color-border-dark)] bg-[var(--color-dark-100)]/90 p-3 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t.title}
                </p>
                {t.message && (
                  <p className="mt-1 text-sm text-[var(--color-light-200)]">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-sm text-[var(--color-light-200)] hover:text-[var(--foreground)]"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
            {t.variant && (
              <div
                className={
                  "mt-2 h-1 rounded-full " +
                  (t.variant === "success"
                    ? "bg-[var(--primary)]"
                    : t.variant === "error"
                    ? "bg-[var(--destructive)]"
                    : "bg-[var(--color-light-200)]")
                }
              />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

