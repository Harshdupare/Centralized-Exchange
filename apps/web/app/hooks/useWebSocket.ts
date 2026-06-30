import { subscribe } from "diagnostics_channel";
import { useEffect, useCallback, useRef, useState } from "react";


type Handler = (data: any) => void;
type Message = { stream?: string, data: any };


const useWebSocket = ({ url }: { url: string }) => {
  const ws = useRef<WebSocket>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<Message[]>([]);
  const handlers = useRef(new Map<string, Handler>());
  const pendingSub = useRef<string[]>([]);

  useEffect(() => {
    if (!url) return;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setIsConnected(true);

      pendingSub.current.forEach(ch => {
        ws.current?.send(JSON.stringify({
          method: "subscribe_orderbook",
          events: [ch]
        }))
      })
      pendingSub.current = []
    }

    ws.current.onmessage = (e) => {
      let msg: Message;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      setMessage((prev) => [...prev, msg]);
      if (msg.stream) {
        handlers.current.get(msg.stream)?.(msg.data)
      }
    }

    ws.current.onclose = () => setIsConnected(false);
    ws.current.onerror = (error) => console.error(error);
  }, []);

  const subscribe = useCallback((stream: string, cb?: Handler) => {
    if (cb) {
      handlers.current.set(stream, cb);
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        method: "subscribe_orderbook",
        events: [stream]
      }))
    } else {
      pendingSub.current.push(stream);
    }
  }, []);

  const unsubscribe = useCallback((stream: string) => {
    handlers.current.delete(stream);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        method: "unsubscribe_orderbook",
        events: [stream]
      }));
    }

  }, []);

  return { isConnected, subscribe, unsubscribe, message };
}

export default useWebSocket;
