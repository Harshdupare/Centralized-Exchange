import { createClient , RedisClientType } from "redis";
import dotenvFlow from "dotenv-flow";
import path from "path";

dotenvFlow.config({
    path : path.resolve(__dirname, "../../../")
})

export class SubcriptionManager{
    private client : RedisClientType;
    private static instance : SubcriptionManager;

    private constructor(){
        this.client = createClient({
            url : process.env.REDIS_URL
        })

        this.client.on("error", (err) => console.error(err));
        this.client.on("connect", () => console.log("connected to sub redis"));

        this.client.connect().catch((error) =>{
            console.log(error);
        })
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new SubcriptionManager();
        }
        return this.instance;
    }

    subcribeToChannel(channel : string , handler : (msg : any) => void){
        this.client.subscribe(channel , (data) =>{
            if(data === "1" || data == "0") return;

            try {
                const payload = JSON.parse(data);
                if(payload.data !== undefined){
                    handler(payload.data);
                }else {
                    handler(payload);
                }
            }catch(error){
                try{
                    handler(data);
                }catch(error){
                    console.log(error);
                }
            }
        })
    }
}