import { Worker } from "bullmq";
import axios from "axios";
import dotenvFlow from "dotenv-flow";
import path from "path";

dotenvFlow.config({
    path : path.resolve(__dirname , "../../../")
})

if(!process.env.REDIS_HOST ||  !process.env.REDIS_PORT || !process.env.NEXT_PUBLIC_API_URL || !process.env.REDIS_PASSWORD){
    throw new Error("environment variables are missing or inavild");
}

const worker = new Worker("LIQUIDATION-QUEUE", async (job)=>{
    const orderObj = job.data;
    const leverage = (orderObj.entryprice * orderObj.quantity)/ orderObj.margin;
    try{
        const order = axios.post(`${process.env.NEXT_PUBLIC_API_URL}/order/create`, {
            userId : orderObj.userId,
            entryprice : orderObj.entryprice,
            quantity  : orderObj.quantity,
            side : orderObj.side,
            type : "MARKET-LIQUIDATE",
            leverage
        }, {
            withCredentials : true
        })
    }catch(error){
        console.error("Failed to create market liquidate order ", error);
        throw error;
    }
}, {
    connection : {
        port : parseInt(process.env.REDIS_PORT),
        host : process.env.REDIS_HOST,
        password : process.env.REDIS_PASSWORD
    }
})


worker.on("completed", (job) => {
    console.log("Job completed : " , job.id);
})

worker.on("failed", (job, err) => {
    console.log("Job failed : " , job?.id , err)
})

export default worker;