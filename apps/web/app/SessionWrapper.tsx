"use client";

import { SessionProvider } from "next-auth/react";
import WebSocketProvider from "./context/WebSocketContext";

export const SessionWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    </SessionProvider>
  );
}
