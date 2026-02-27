"use client";

import { Toaster } from "sileo";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <HotkeysProvider>
        {children}
        <Toaster position="bottom-right" />
      </HotkeysProvider>
    </ThemeProvider>
  );
}
