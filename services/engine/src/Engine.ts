import { s3manager } from "./S3manager.js";
import { OrderBook } from "./OrderBook.js";
import { UserBalance , UserPosition } from "@repo/types";
import { eventQueue , RedisManager } from "@repo/event-queue";
import { Worker } from "bullmq";
import dotenvFlow from "dotenv-flow";
import path from "path";
import { error } from "console";

dotenvFlow.config({
    path : path.resolve(__dirname , "../../../")
});

export class Engine{
    public static instance : Engine; 
    private orderBook : OrderBook;
    private userPosition : Map<String, UserPosition> = new Map();
    private userBalance :Map<String , UserBalance> = new Map();


    private constructor(){
        this.orderBook = null;
        this.startWorker();
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new Engine();
        }
        return this.instance;
    }

    startWorker(){
        if(!process.env.REDIS_PORT && !process.env.REDIS_HOST){
            throw error({
                message : "Redis host/port is null or invalid"
            })
        }
        new Worker("FUNDING_QUEUE", async(job)=>{
            if(job.data.fundingRate && job.data.marketPrice){
                this.applyFunding(job.data.fundingRate, job.data.marketPrice);
            }
        }, {
            connection : {
                port : parseInt(process.env.REDIS_PORT),
                host : process.env.REDIS_HOSTS
            }
        })
    }

    applyFunding(fundingRate : number , marketPrice : number){
        for(const positions of this.userPosition.values()){
            const side = positions.side;
            const fundingCharge = positions.quantity * marketPrice * fundingRate;

            if(side === "UNINITIALIZED") continue;

            if(fundingRate > 0){
                if(side === "LONG"){
                    positions.margin -= Math.abs(fundingCharge);
                }else{
                    positions.margin += Math.abs(fundingCharge);
                }
            }else{
                if(side === "LONG"){
                    positions.margin += Math.abs(fundingCharge);
                }else{
                    positions.margin -= Math.abs(fundingCharge);
                }
            }
        }
    }
}