'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type FormState = {
  postcode: string;
  suburb: string;
  state: string;
  setField: (k: keyof Omit<FormState, 'setField' | '_hasHydrated' | 'setHasHydrated'>, v: string) => void;

  // hydration flag (helps avoid SSR/CSR mismatch)
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
};

export const useFormStore = create<FormState>()(
  persist(
    (set, get) => ({
      postcode: '',
      suburb: '',
      state: '',
      setField: (k, v) => set({ [k]: v } as any),

      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'verifier-form', // localStorage key
      version: 2,
      storage: createJSONStorage(() => localStorage),

      // Only persist the fields you need (do not persist hydration flags)
      partialize: (state) => ({
        postcode: state.postcode,
        suburb: state.suburb,
        state: state.state,
      }),

      // Migrate older versions to the current shape
      migrate: (persisted: unknown, fromVersion: number) => {
        // If nothing in storage yet, return defaults
        if (!persisted || typeof persisted !== 'object') {
          return { postcode: '', suburb: '', state: '' };
        }

        // Only persist { postcode, suburb, state }, so just ensure they exist
        const p = persisted as Record<string, unknown>;

        const next = {
          postcode: typeof p.postcode === 'string' ? p.postcode : '',
          suburb: typeof p.suburb === 'string' ? p.suburb : '',
          state: typeof p.state === 'string' ? p.state : '',
        };

        return next;
      },

      // Mark as hydrated after rehydration completes (run-time flag, not persisted)
      onRehydrateStorage: () => (state) => {
        try {
          // state can be undefined if the store was recreated
          state?.setHasHydrated(true);
        } catch {
          // no-op
        }
      },
    }
  )
);
