"use client";

import { createContext, useContext, useRef, useState, useCallback } from "react";

type Handler = (data: any) => void;

interface WebSocketContextType {
  isConnected: boolean,
  subscribe: (stream: string, handler: Handler) => void,
  unsubscribe: (stream: string, handler?: Handler) => void
}


const WebSocketContext = createContext<WebSocketContextType | null>(null);

const WebSocketContextProvider = ({ children }: { children: React.ReactNode }) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const handlers = useRef(new Map<string, Set<Handler>>());
  const subscriberStream = useRef(new Set<string>());
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const url = process.env.NEXT_WSS_URL;

    if (!url || ws.current?.readyState == WebSocket.OPEN) return;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log("WebSocket Connected");
      setIsConnected(true)

      subscriberStream.current.forEach((stream) => {
        ws.current?.send(
          JSON.stringify({
            method: "subscribe_orderbook",
            events: [stream]
          })
        );
      })
    };

    ws.current.onmessage = (raw) => {
      const msg = JSON.parse(raw.data);

      if (msg.stream && handlers.current.has(msg.stream)) {
        handlers.current.get(msg.stream)?.forEach((handler) => handler(msg.data));
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket Disconnected");
      setIsConnected(true);

      reconnectTimeout.current = setTimeout(connect, 2000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };

  }, []);


  const subscribe = useCallback((stream: string, handler: Handler) => {
    if (!handlers.current.get(stream)) {
      handlers.current.set(stream, new Set());
    }

    handlers.current.get(stream)?.add(handler);

    if (!subscriberStream.current.has(stream)) {
      subscriberStream.current.add(stream);
      if (ws.current?.readyState == WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ method: "subscribe_orderbook", events: [stream] }));
      }
    }

  }, []);

  const unsubscribe = useCallback((stream: string, handler?: Handler) => {
    if (handlers.current.has(stream)) {
      if (handler) {
        handlers.current.get(stream)?.delete(handler);
      } else {
        handlers.current.get(stream)?.clear();
      }

      if (handlers.current.get(stream)?.size === 0) {
        handlers.current.delete(stream);
        subscriberStream.current.delete(stream);
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            method: "unsubscribe_orderbook",
            events: [stream]
          }));
        }
      }
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketContextProvider;

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {

  }
  return context;
}
