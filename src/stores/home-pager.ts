import { create } from "zustand";

// The home screen is three pages side by side: the menu on the left, the cards in the middle,
// and the running breathing session on the right. Swiping right moves left through them.
export type HomePage = "exercise" | "home" | "menu";

export const homePagePositions: Record<HomePage, number> = { menu: -1, home: 0, exercise: 1 };

interface HomePagerStore {
  page: HomePage;
  setPage: (page: HomePage) => void;
}

export const useHomePagerStore = create<HomePagerStore>()((set) => ({
  page: "home",
  setPage: (page) => set({ page }),
}));
