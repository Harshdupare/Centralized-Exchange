import { Queue } from "bullmq";
import dotenv from "dotenv";
import path from "path";
const directoryPath = import.meta.dirname;

dotenv.config({
    path : path.resolve(directoryPath , "../../../.env")
}) 

const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
};

export const eventQueue = new Queue("EVENT-QUEUE" , {
    connection : connection
})

export const fundingQueue = new Queue("FUNDING-QUEUE",{
    connection : connection
})

export const liquidationQueue = new Queue("LIQUIDATION-QUEUE", {
    connection : connection
})