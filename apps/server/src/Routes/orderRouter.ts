import { Router } from "express";
import { addToQueue }from "@repo/queue";
import { client } from "@repo/db";

const orderRouter = Router();

orderRouter.post("/create", async(req, res) => {
    const orderData = req.body;
    try{
        await addToQueue(orderData);
        res.status(201).json({
            message : "order created successfully",
            order : orderData
        });
    }catch(error){
        console.error("error in creating the order ", error);
        res.status(500).json({error : "failed to create order"});
    }
});

orderRouter.post("/cancel", async(req, res)=>{
    const orderData = req.body;
    try{
        await addToQueue(orderData);
        res.status(201).json({
            message : "order cancelled successfully",
            order : orderData
        })
    }catch(error){
        console.error("error in canceling the order " , error);
        res.status(500).json({error : "failed to cancel order"});
    }
})

orderRouter.get("/:id", async(req ,  res)=>{
    const { id } = req.params;
    try{    
        const order = await client.order.findFirst({
            where : {
                userId : id
            },
            include : {
                trades : true
            }
        });

        if(!order){
            res.status(404).json({
                message : "order not found"
            })
            return;
        }

        res.status(201).json(order);

    }catch(error){
        console.error("failed to find order " , error);
        res.status(500).json({
            error : "failed to find the order"
        })
    }
})

export default orderRouter;