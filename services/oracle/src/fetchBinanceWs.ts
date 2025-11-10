import { RedisManager } from "@repo/event-queue";
import { WebSocket } from "ws";
import { emitIndexPrice } from "./marketDataBus.js";

const STREAM = 'btcusdt@markPrice';

export function startOracle(){
    const wss = new WebSocket(`wss://fstream.binance.com/ws/${STREAM}`);

    wss.on("open", () => {
        console.log("Connected to Binance")
    })

    wss.on("message", (raw) =>{
        const data = JSON.parse(raw.toString());
        const indexPrice = parseFloat(data.i);
        const fundingRate = parseFloat(data.r);
        const markPrice = parseFloat(data.p);
        const nextfundingTime = data.T;


        const payload = JSON.stringify({s:'btcusdt', i : indexPrice , r : fundingRate, m : markPrice , T : nextfundingTime});
        RedisManager.getInstance().publishToChannel("prices:update", payload);
        emitIndexPrice(indexPrice);
    })

    wss.on('error', (error) =>{
        console.log("Failed to connect Binance ws server : " , error);
    })

}
