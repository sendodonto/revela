import { create } from 'zustand';

export type Toast = { id: number; message: string; tone: 'ok' | 'error' };

export const useToasts = create<{ items: Toast[]; push: (message: string, tone?: Toast['tone']) => void }>()((set) => ({
  items: [],
  push: (message, tone = 'ok') => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { id, message, tone }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), tone === 'error' ? 5200 : 3000);
  },
}));

export const toast = (message: string, tone?: Toast['tone']) => useToasts.getState().push(message, tone);
export const toastError = (e: unknown, fallback = 'Algo deu errado. Tente de novo.') => toast(e instanceof Error ? e.message : fallback, 'error');
