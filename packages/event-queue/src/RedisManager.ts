import { createClient , RedisClientType } from "redis";
import dotenvFlow from "dotenv-flow";
import path from "path";

dotenvFlow.config({
    path : path.resolve(__dirname, "../../../")
});

export class RedisManager{
    private client : RedisClientType;
    private static instance : RedisManager;

    private constructor(){
        this.client = createClient({
            url : process.env.REDIS_URL
        })
        this.client.on("error" , (err) => console.error(err));
        this.client.on("connect" , () => console.log("connected to redis"));
        this.client.connect().catch((error) => {
            console.error(error);
        })
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    public async publishToChannel(channel: string, message : string){
        await this.client.publish(channel, message);
    }

    public async updateHash(channel: string , data : Record<string, string>){
        await this.client.hSet(channel, data);
    }
    
}

