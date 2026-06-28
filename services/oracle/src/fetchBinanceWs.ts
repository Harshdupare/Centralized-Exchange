import { WebSocket } from "ws";
import dotenv from "dotenv"
import path from "path";
import { RedisManager } from "@repo/event-queue";
import { emitIndexPrice } from "./marketDataBus.js";
const directoryPath = import.meta.dirname;
dotenv.config({
  path: path.resolve(directoryPath, "../../../.env")
})


export const startOracle = () => {
  console.log(process.env.MARKET_STREAM_BASE_URL, process.env.MARKET)
  const ws = new WebSocket(`${process.env.MARKET_STREAM_BASE_URL}/${process.env.MARKET}`);


  ws.on("open", () => {
    console.log("Welcome to Binance : ", process.env.MARKET);
  })


  ws.on("message", (raw) => {
    const data = JSON.parse(raw.toString());
    const indexPrice = data.i;
    const fundingRate = data.r;
    const markPrice = data.p;
    const nextFundingTime = data.T;

    const payload = JSON.stringify({
      s: "btcusdt",
      i: indexPrice,
      r: fundingRate,
      p: markPrice,
      T: nextFundingTime
    })
    RedisManager.getInstance().publishToChannel("prices:update", payload)
    emitIndexPrice(indexPrice);

  })

  ws.on("error", (error) => {
    console.error(error);
  })
}


