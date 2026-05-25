import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useAuthStore } from "./auth-store";

export interface BadgeState {
  lastViewed: Record<string, number>;
  sessionLastViewed: Record<string, number>;
  seenItems: Record<string, boolean>;
  initSessionViewed: (tabId: string) => void;
  markTabAsViewed: (tabId: string) => void;
  markItemAsSeen: (itemId: string) => void;
  isItemNewOnScreen: (itemId: string, itemCreatedAt: string, tabId: string) => boolean;
  isItemUnreadForNavbar: (itemId: string, itemCreatedAt: string, tabId: string) => boolean;
}

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      lastViewed: {},
      sessionLastViewed: {},
      seenItems: {},
      initSessionViewed: (tabId: string) => {
        const { lastViewed, sessionLastViewed } = get();
        if (sessionLastViewed[tabId] === undefined) {
          set({
            sessionLastViewed: {
              ...sessionLastViewed,
              [tabId]: lastViewed[tabId] || 0,
            },
          });
        }
      },
      markTabAsViewed: (tabId: string) => {
        const now = Date.now();
        const { lastViewed, sessionLastViewed } = get();
        // Ensure session view is preserved before updating lastViewed
        const currentSessionView = sessionLastViewed[tabId] !== undefined ? sessionLastViewed[tabId] : (lastViewed[tabId] || 0);
        set({
          sessionLastViewed: {
            ...sessionLastViewed,
            [tabId]: currentSessionView,
          },
          lastViewed: {
            ...lastViewed,
            [tabId]: now,
          },
        });
      },
      markItemAsSeen: (itemId: string) =>
        set((state) => ({
          seenItems: {
            ...state.seenItems,
            [itemId]: true,
          },
        })),
      isItemNewOnScreen: (itemId: string, itemCreatedAt: string, tabId: string) => {
        const isAdmin = useAuthStore.getState().profile?.role === "admin";
        if (isAdmin) {
          return false;
        }
        const state = get();
        if (state.seenItems[itemId]) {
          return false;
        }
        const refTime = state.sessionLastViewed[tabId] !== undefined ? state.sessionLastViewed[tabId] : (state.lastViewed[tabId] || 0);
        const itemTime = new Date(itemCreatedAt).getTime();
        if (Number.isNaN(itemTime)) {
          return false;
        }
        return itemTime > refTime;
      },
      isItemUnreadForNavbar: (itemId: string, itemCreatedAt: string, tabId: string) => {
        const isAdmin = useAuthStore.getState().profile?.role === "admin";
        if (isAdmin) {
          return false;
        }
        const state = get();
        if (state.seenItems[itemId]) {
          return false;
        }
        const refTime = state.lastViewed[tabId] || 0;
        const itemTime = new Date(itemCreatedAt).getTime();
        if (Number.isNaN(itemTime)) {
          return false;
        }
        return itemTime > refTime;
      },
    }),
    {
      name: "ji-connect-badges-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastViewed: state.lastViewed,
        seenItems: state.seenItems,
      }),
      version: 2,
    },
  ),
);
