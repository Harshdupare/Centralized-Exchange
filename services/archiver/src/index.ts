import dotenv from "dotenv";
import path from "path";

const directoryPath = import.meta.dirname;

dotenv.config({
    path : path.resolve(directoryPath , "../../../.env")
}); 
console.log("db url ------> ", process.env.DATABASE_URL);

import { Worker } from "bullmq";
import  client  from "@repo/db/client";


    
(async() =>{
    if(!process.env.REDIS_PORT || !process.env.REDIS_HOST || !process.env.REDIS_PASSWORD){
        throw new Error("Environment variable is invalid or missing");
    }
    console.log("Archiver is running");
    const worker = new Worker("EVENT_QUEUE", async(job) =>{
        const {type , data} = job.data;
        if(type === "CREATE_UPDATE"){
            await client.order.create({
                data : {
                    id : data.id,
                    entryPrice : data.entryprice,
                    qauntity : data.quantity,
                    leverage : data.leverage,
                    userId : data.userId,
                    side : data.side
                }
            })
        }

        if(type === "DEPTH_UPDATE"){
            await client.depth.upsert({
                where : {
                    id : "BTCUSDT",
                },
                create : {
                    bids : data.bids,
                    asks : data.asks,
                },
                update : {
                    bids : data.bids,
                    asks : data.asks,
                }
            })
        }

        if(type === "BALANCE_UPDATE"){
            await client.user.update({
                where : {
                    id : data.userId
                },
                data : {
                    balance : data.balance
                }
            })
        }

        if(type === "FILL_UPDATE"){
            await client.trade.createMany({
                data : [
                    {
                        userId : data.userId,
                        orderId : data.orderId,
                        quantity : data.quantity,
                        price : data.price,
                        side : data.side,
                    },{
                        userId : data.otherUserId,
                        orderId : data.orderId,
                        quantity : data.quantity,
                        price : data.price,
                        side : data.side === "LONG"? "SHORT" : "LONG",
                    }
                ]
            })

            await client.order.update({
                where : {
                    id : data.otherOrderId
                },
                data : {
                    executedQty : {
                        increment : data.quantity
                    }
                }
            })
        }

        if(type === "POSITION_UPDATE"){
            await client.position.upsert({
                where : {
                    userId : data.userId,
                },
                create : {
                    userId : data.userId,
                    side : data.side,
                    entryPrice : data.entryprice,
                    qauntity : data.quantity,
                    margin : data.margin
                },
                update : {
                    userId : data.userId,
                    side : data.side,
                    entryPrice : data.entryprice,
                    qauntity : data.quantity,
                }
            })
        }

        if(type === "CANCEL_ORDER"){
            await client.order.delete({
                where : {
                    id : data.orderId
                }
            })
        }

    }, {
        connection : {
            port : parseInt(process.env.REDIS_PORT),
            host : process.env.REDIS_HOST,
            password : process.env.REDIS_PASSWORD,
        }
    })


    worker.on("completed" , (job)=> {
        console.log("job archived successfully", job.id);
    })

    worker.on("failed", (job)=>{
        console.log("job failed to archive " , job?.id);
    })

})();
