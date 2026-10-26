import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { newId } from '../core/id';

export type ToastKind = 'status' | 'alert';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface NotificationApi {
  toasts: Toast[];
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationApi | null>(null);

export function useNotifications(): NotificationApi {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = newId();
      setToasts((prev) => [...prev, { id, kind, message }]);
      const timer = setTimeout(() => dismiss(id), 6000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const api = useMemo<NotificationApi>(
    () => ({
      toasts,
      notifySuccess: (m: string) => push('status', m),
      notifyError: (m: string) => push('alert', m),
      dismiss,
    }),
    [toasts, push, dismiss],
  );

  return <NotificationContext.Provider value={api}>{children}</NotificationContext.Provider>;
}
