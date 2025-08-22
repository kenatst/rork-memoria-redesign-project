import React, { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import Toast, { ToastType } from '@/components/Toast';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  toasts?: ToastItem[];
  dismissToast?: (id: string) => void;
}

const [ToastContextProvider, useToast] = createContextHook<ToastContextValue>(() => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString();
    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration + animation time
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, (duration || 4000) + 500);
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast('success', title, message);
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast('error', title, message);
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast('warning', title, message);
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast('info', title, message);
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return useMemo(() => ({
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    toasts,
    dismissToast,
  }), [showToast, showSuccess, showError, showWarning, showInfo, toasts, dismissToast]);
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContextProvider>
      <ToastRenderer />
      {children}
    </ToastContextProvider>
  );
}

function ToastRenderer() {
  const { toasts, dismissToast } = useToast() as any;
  
  return (
    <>
      {toasts?.map((toast: ToastItem) => (
        <Toast
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          visible={true}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </>
  );
}

export { useToast };