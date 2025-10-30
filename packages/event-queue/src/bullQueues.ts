import { Queue } from "bullmq";
import path from "path";
import dotenvFlow from "dotenv-flow";


dotenvFlow.config({
    path : path.resolve(__dirname, "../../../")
});


export const eventQueue = new Queue('EVENT-QUEUE',{
    connection : {
        host : process.env.REDIS_HOST,
        port : Number(process.env.REDIS_PORT),
        password : process.env.REDIS_PASSWORD
    }
})

export const liquidationQueue = new Queue('LIQUIDATION-QUEUE', {
    connection : {
        host : process.env.REDIS_HOST,
        port : Number(process.env.REDIS_PORT),
        password : process.env.REDIS_PASSWORD
    }
})

export const fundingQueue = new Queue('FUNDING-QUEUE',{
    connection : {
        host : process.env.REDIS_HOST,
        port : Number(process.env.REDIS_PORT),
        password : process.env.REDIS_PASSWORD
    }  
})


