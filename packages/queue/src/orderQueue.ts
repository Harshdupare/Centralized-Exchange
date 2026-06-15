import { Queue } from "bullmq";
import { Order } from "@repo/types";
import dotenv from "dotenv";
import path from "path";
const directoryPath = import.meta.dirname;

dotenv.config({
    path : path.resolve(directoryPath , "../../../.env")
}) 


if(!process.env.REDIS_PORT || !process.env.REDIS_HOST || !process.env.REDIS_PASSWORD){
    throw new Error("Environment variable is missing or invalid");
}

export const orderQueue = new Queue("ORDER_QUEUE" , {
    connection : {
        port : parseInt(process.env.REDIS_PORT),
        host : process.env.REDIS_HOST,
        password : process.env.REDIS_PASSWORD,
    }
})

export const addToQueue = async(order : Order) => {
    try{
        await orderQueue.add("order",order);
        console.log("order is added to queue");
    }catch(error){
        console.log("failed to add order to queue");
    }
}