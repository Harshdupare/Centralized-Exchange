import { Worker } from "bullmq";
import { Engine } from "@repo/engine";
import dotenvFlow from "dotenv-flow";
import path from "path";

dotenvFlow.config({
    path : path.resolve(__dirname, "../../../")
});

(async() =>{
    if(!process.env.REDIS_PORT || !process.env.REDIS_HOST || !process.env.REDIS_PASSWORD){
        throw new Error("Enviroment variable is missing or invaild");
    }

    await Engine.getInstance().create();
    const worker = new Worker("ORDER_QUEUE", async(job)=>{
        const order = job.data;
        Engine.getInstance().processOrder(order);
    }, {
        connection : {
            port : parseInt(process.env.REDIS_PORT),
            host : process.env.REDIS_HOST,
            password : process.env.REDIS_PASSWORD,
        }
    });

    worker.on("completed", (job)=>{
        console.log("job is completed successfully " , job.id);
    })

    worker.on("failed", (job)=>{
        console.log("job failed ", job?.id);
    })

})();