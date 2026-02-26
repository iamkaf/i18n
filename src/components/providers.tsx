"use client";

import { Toaster } from "sileo";
import { HotkeysProvider } from "@tanstack/react-hotkeys";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HotkeysProvider>
      {children}
      <Toaster position="bottom-right" />
    </HotkeysProvider>
  );
}
