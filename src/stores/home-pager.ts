import { create } from "zustand";

// The home screen is three pages side by side: the running breathing session on the left, the
// cards in the middle, and the menu on the right. Swiping left moves right through them.
export type HomePage = "exercise" | "home" | "menu";

export const homePagePositions: Record<HomePage, number> = { exercise: -1, home: 0, menu: 1 };

interface HomePagerStore {
  page: HomePage;
  setPage: (page: HomePage) => void;
}

export const useHomePagerStore = create<HomePagerStore>()((set) => ({
  page: "home",
  setPage: (page) => set({ page }),
}));
