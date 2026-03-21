"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const COLLAPSED_KEY = "kanta-sidebar-collapsed";
const HIDDEN_KEY = "kanta-sidebar-hidden";

type SidebarLayoutContextType = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  toggleHidden: () => void;
  mounted: boolean;
};

const SidebarLayoutContext = createContext<SidebarLayoutContextType | null>(null);

export function SidebarLayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [hidden, setHiddenState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setCollapsedState(localStorage.getItem(COLLAPSED_KEY) === "1");
      setHiddenState(localStorage.getItem(HIDDEN_KEY) === "1");
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const n = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, n ? "1" : "0");
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  const setHidden = useCallback((v: boolean) => {
    setHiddenState(v);
    try {
      localStorage.setItem(HIDDEN_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHidden = useCallback(() => {
    setHiddenState((prev) => {
      const n = !prev;
      try {
        localStorage.setItem(HIDDEN_KEY, n ? "1" : "0");
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  return (
    <SidebarLayoutContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed,
        hidden,
        setHidden,
        toggleHidden,
        mounted,
      }}
    >
      {children}
    </SidebarLayoutContext.Provider>
  );
}

export function useSidebarLayout() {
  const ctx = useContext(SidebarLayoutContext);
  if (!ctx) {
    throw new Error("useSidebarLayout must be used within SidebarLayoutProvider");
  }
  return ctx;
}
