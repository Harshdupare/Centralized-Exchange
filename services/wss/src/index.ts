import { WebSocket, WebSocketServer } from "ws";
import { createClient } from "redis";
import dotenv from 'dotenv';
import path from 'path';
const directoryPath = import.meta.dirname;

dotenv.config({
  path: path.resolve(directoryPath, "../../../.env")
})


async function startWss() {
  if (!process.env.REDIS_HOST || !process.env.WSS_PORT) {
    throw new Error("env variable are invalid or missing");
  }

  const redisUrl = process.env.REDIS_URL;
  const wssPort = parseInt(process.env.WSS_PORT);

  const wss = new WebSocketServer({ port: wssPort });

  console.log(wssPort)

  wss.on("connection", async (ws) => {
    console.log("Client Connected");

    const redisSub = createClient({
      url: redisUrl
    });

    redisSub.on("error", error => console.log(error));
    await redisSub.connect();

    console.log("redisConnected")

    ws.on("message", async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      console.log(msg)

      if (msg.method === "subscribe_orderbook" && Array.isArray(msg.events)) {
        for (const channel of msg.events) {

          await redisSub.subscribe(channel, (message) => {

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                stream: channel,
                data: JSON.parse(message)
              }))
            }
          })
        }
      }

      if (msg.method === "unsubscribe_orderbook" && Array.isArray(msg.events)) {
        for (const channel of msg.events) {
          await redisSub.unsubscribe(channel);
        }
      }
    })

    ws.on("close", () => {
      console.log("Client disconnect");
      redisSub.destroy();
    })

  })
}

startWss().catch(err => {
  console.log(err);
  process.exit(1);
})
