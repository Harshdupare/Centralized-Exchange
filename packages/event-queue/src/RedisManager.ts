import {createClient , RedisClientType } from "redis";
import dotenv from "dotenv";
import path from "path";
const directoryPath = import.meta.dirname;

dotenv.config({
    path : path.resolve(directoryPath , "../../../.env")
}) 

export class RedisManager {
    private client : RedisClientType;
    private static instance : RedisManager;

    private constructor(){
        console.log("url ---> ", process.env.REDIS_URL)
        this.client = createClient({
            url : process.env.REDIS_URL
       })

       //set an event-listener on error and connect and on succefully connection callback function executed 
       this.client.on("error" , (err) => console.error(err));
       this.client.on("connect" , ()=> console.log("connected to redis"));
       this.client.connect().catch((err) =>{
            console.error("Error while connecting to redis server : ", err)
       })
    }

    public static getInstance(){
        if(this.instance === undefined){
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    public async publishToChannel(channel : string , data : any){
        await this.client.publish(channel , data);
    }

    // Record<string , string>  is just or typ
    public  async updateHash(channel : string , data : Record<string ,string>){
        await this.client.hSet(channel, data);
    }
}
