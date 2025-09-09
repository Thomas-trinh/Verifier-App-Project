'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type FormState = {
  postcode: string;
  suburb: string;
  state: string;
  setField: (k: 'postcode' | 'suburb' | 'state', v: string) => void;
  reset: () => void;
};

export const useFormStore = create<FormState>()(
  persist(
    (set) => ({
      postcode: '',
      suburb: '',
      state: '',
      setField: (k, v) => set((s) => ({ ...s, [k]: v })),
      reset: () => set({ postcode: '', suburb: '', state: '' }),
    }),
    { name: 'verifier-form' }
  )
);
