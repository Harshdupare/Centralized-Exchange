import { useRef, useState } from "react";


type Handler = (data: any) => void;
type Message = { stream?: string, data: any };


const useWebSocket = () => {
  const ws = useRef<WebSocket>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<Message[]>([]);
  const handlers = useRef(new Map<string, Handler>());
  const pendingSub = useRef<string[]>([]);


}

export default useWebSocket;
