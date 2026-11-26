import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

/**
 * UI store.
 *
 * Holds purely transient interface state — toasts, the confirmation dialog and
 * the success celebration. None of it is persisted: it is rebuilt on every
 * launch.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  icon?: LucideIcon;
}

export interface Celebration {
  title: string;
  subtitle?: string;
}

interface UIState {
  toast: ToastItem | null;
  confirmOptions: ConfirmOptions | null;
  celebration: Celebration | null;

  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (value: boolean) => void;
  celebrate: (title: string, subtitle?: string) => void;
  dismissCelebration: () => void;
}

/** Resolver for the pending confirmation promise, kept out of the store. */
let confirmResolver: ((value: boolean) => void) | null = null;
let toastSeq = 0;

/** Triggers a light haptic. Silently ignored when unavailable. */
export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
  try {
    switch (kind) {
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    // Haptics are a progressive enhancement — never let them break an action.
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  toast: null,
  confirmOptions: null,
  celebration: null,

  showToast(message, tone = 'success') {
    const id = (toastSeq += 1);
    set({ toast: { id, message, tone } });
    haptic(tone === 'error' ? 'error' : 'light');
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 2800);
  },

  hideToast() {
    set({ toast: null });
  },

  requestConfirm(options) {
    // A second request supersedes the first; the earlier promise resolves false.
    if (confirmResolver) {
      confirmResolver(false);
      confirmResolver = null;
    }
    set({ confirmOptions: options });
    return new Promise<boolean>((resolve) => {
      confirmResolver = resolve;
    });
  },

  resolveConfirm(value) {
    set({ confirmOptions: null });
    if (confirmResolver) {
      confirmResolver(value);
      confirmResolver = null;
    }
  },

  celebrate(title, subtitle) {
    set({ celebration: { title, subtitle } });
    haptic('success');
  },

  dismissCelebration() {
    set({ celebration: null });
  },
}));

/* Convenience hooks ------------------------------------------------------ */

export const useToast = () => useUIStore((s) => s.showToast);
export const useConfirm = () => useUIStore((s) => s.requestConfirm);
export const useCelebrate = () => useUIStore((s) => s.celebrate);
