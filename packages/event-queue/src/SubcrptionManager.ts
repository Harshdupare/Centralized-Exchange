import { createClient , RedisClientType } from "redis";
import dotenv from "dotenv";
import path from "path";
const directoryPath = import.meta.dirname;
dotenv.config({
    path : path.resolve(directoryPath , "../../../.env")
}) 

export class SubcriptionManager{
    private client : RedisClientType;
    private static instance : SubcriptionManager;

    private constructor(){
        this.client = createClient({
            url : process.env.REDIS_URL
        });

        this.client.on("error", (err) => console.error(err));
        this.client.on("connect" , () => console.log("Redis Sub is running"));
        this.client.connect().catch((err) =>{
            console.error(err);
        })
    }

    public static getInstance(){
        if(this.instance === undefined){
            this.instance = new SubcriptionManager();
        }
        return this.instance;
    }

    public subscribeToChannel(channel : string , handler:(args : any)=> void){
        this.client.subscribe(channel , (data) =>{
            if(data === "1" || data === "0") return;

            try{
                const payload = JSON.parse(data)
                if(payload.data !== undefined){
                    handler(payload.data);
                }else{
                    handler(payload);
                }
            }catch(error){
                try{
                    handler(data);
                }catch(error){
                    console.error(error);
                }
            }
        })
    }
} 