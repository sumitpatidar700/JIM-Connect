import { create } from 'zustand';

import { AuthState } from '@/src/types/app';
import { batchService } from '@/src/services/batch-service';

export const useAuthStore = create<AuthState>((set, get) => ({
  clearAuthState: () => set({ profile: null, session: null, adminSelectedBatch: null }),
  isBootstrapping: true,
  profile: null,
  session: null,
  activeSession: null,
  batches: [],
  adminSelectedBatch: null,
  setAuthState: ({ profile, session }) => set({ profile, session }),
  setBootstrapping: (value) => set({ isBootstrapping: value }),
  setActiveSession: (activeSession) => set({ activeSession }),
  setBatches: (batches) => set({ batches }),
  setAdminSelectedBatch: (adminSelectedBatch) => set({ adminSelectedBatch }),
  fetchBatches: async () => {
    try {
      const data = await batchService.listBatches();
      set({ batches: data });
    } catch (e) {
      console.error('Error fetching batches:', e);
    }
  },
}));
