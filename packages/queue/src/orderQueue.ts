import { Queue } from "bullmq";
import { Order } from "@repo/types";
import dotenvFlow from "dotenv-flow";
import path from "path";

dotenvFlow.config({
    path : path.resolve(__dirname , "../../../")
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