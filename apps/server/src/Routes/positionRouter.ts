import { Router } from "express";
import { client } from "@repo/db";

const positionRouter = Router();


positionRouter.get("/:userId", async(req , res) =>{
    const { userId } = req.params;
    try{
        const position = await client.position.findUnique({
            where : {
                userId : userId
            }
        })

        if(!position){
            res.status(404).json({
                error : "Position not found"
            })
            return
        }

        res.status(201).json(position);
    }catch(error){
        console.error("Failed in fetching position : ", error);
        res.status(500).json({
            error : "Failed to fetch position"
        })
    }
})

export  default positionRouter;