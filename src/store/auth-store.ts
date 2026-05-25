import { create } from 'zustand';

import { AuthState } from '@/src/types/app';

export const useAuthStore = create<AuthState>((set) => ({
  clearAuthState: () => set({ profile: null, session: null }),
  isBootstrapping: true,
  profile: null,
  session: null,
  setAuthState: ({ profile, session }) => set({ profile, session }),
  setBootstrapping: (value) => set({ isBootstrapping: value }),
}));
