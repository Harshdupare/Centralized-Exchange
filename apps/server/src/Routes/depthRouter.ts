import { Router } from "express";
import { client } from "@repo/db";

const depthRouter = Router();

depthRouter.get("/", async(req , res)=>{
    try{
        const depth = await client.depth.findFirst({
            where : {
                id : "BTCUSDT"
            }
        })
        if(!depth){
            res.status(404).json({
                error : "Depth not found"
            });
            return;
        }

        res.status(201).json(depth);
    }catch(error){
        console.error("Failed in fetching depth : ", error);
        res.status(500).json({
            error : "Failed to fetch depth"
        })
    }
})


export default depthRouter