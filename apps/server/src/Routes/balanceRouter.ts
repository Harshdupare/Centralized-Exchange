import { Router } from "express";
import { client } from "@repo/db";


const balanceRouter = Router();

balanceRouter.get("/:id", async(req , res)=>{
    const { id } = req.params;
    try{    
        const user = await client.user.findFirst({
            where :{
                id : id
            }
        })

        if(!user){
            res.status(404).json({
                error : "user not found"
            })
            return;
        }

        res.status(201).json({
            message : "Balance fetched successfully",
            balance : user?.balance
        })

    }catch(error){
        console.error("error while fetching balance : " , error);
        res.status(500).json({
            error : "failed to fetch balance"
        })
    }
})


export default balanceRouter;