import { s3manager } from "./S3manager.js";
import { OrderBook } from "./OrderBook.js";
import { UserBalance , UserPosition, Order, orderSide, orderType ,Fill } from "@repo/types";
import { eventQueue , RedisManager } from "@repo/event-queue";
import { Worker } from "bullmq";
import dotenvFlow from "dotenv-flow";
import{v4 as uuidv4} from "uuid";

import path from "path";
import { markAsUncloneable } from "worker_threads";



dotenvFlow.config({
    path : path.resolve(__dirname , "../../../")
});

const ENGINE_KEY = "process.env.ENGINE_KEY";

export class Engine{
    public static instance : Engine; 
    private orderBook : OrderBook;
    private userPosition : Map<String, UserPosition> = new Map();
    private userBalance :Map<String , UserBalance> = new Map();


    private constructor(){
        this.orderBook = null;
        this.startWorker();
    }

    public static getInstance() : Engine{
        if(!this.instance){
            this.instance = new Engine();
        }
        return this.instance;
    }

    startWorker(){
        if(!process.env.REDIS_PORT && !process.env.REDIS_HOST){
            throw new Error("Redis host/port is null or invalid");
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

    private async saveSnaphot(){
        const data = {
           orderBook : this.orderBook?.getSnapshot(),
           userPosition : Array.from(this.userPosition.entries()),
           userBalance  : Array.from(this.userBalance.entries()),
        }
        await s3manager.uploadSnapshot(data, ENGINE_KEY);
    }

    async create(){
        const snapshot = await s3manager.downloadSnapshot(ENGINE_KEY);
        const engine = new Engine();
        try{
            if(snapshot){
                const orderbook = snapshot.orderBook
                engine.orderBook = new OrderBook(orderbook.bids , orderbook.asks, orderbook.market);
                if(snapshot.userPosition){
                    for(const [userId, positions] of snapshot.userPosition){
                        engine.userPosition.set(userId, positions);
                    }
                }
                if(snapshot.userBalance){
                    for(const [userId, balance] of snapshot.userBalance){
                        engine.userBalance.set(userId, balance);
                    }
                }

            }else{
                engine.orderBook = new OrderBook([], [] , "BTCUSDT");
            }
        }catch(error){
            console.log(error);
            Engine.instance = null;
            throw error
        }
        setInterval(() => {
            engine.saveSnaphot();                          
        }, 3000);
    }


    processOrder(order : Order){
        console.log("processing order of : " , order);
        switch(order.type) {
            case "LIMIT-CREATE" : {
                try{
                    this.createOrder(
                        order.userId,
                        order.side,
                        order.entryprice,
                        order.quantity,
                        order.leverage,
                        order.type
                    )
                }catch(error){
                    console.log("Failed to create Limit order : ", error);
                }
            }
        }
    }
    
    createOrder(
        userId : string,
        side : orderSide,
        entryprice : number,
        quantity : number,
        leverage : number,
        type : orderType
    ){  
        try{
            this.ensureUser(userId);
            this.checkAndLockVBalance(
                userId,
                side,
                entryprice,
                quantity,
                leverage
            );

            const orderId = uuidv4();

            const order = {
                id : orderId,
                userId,
                entryprice,
                quantity,
                type,
                side,
                leverage,
                filled : 0,
            }

            const {executedQty , fills} = this.orderBook.addOrder(order);

            this.updateuserPnl(fills, executedQty , order);
        }catch(error){
            throw new Error(error);
        }
        
    }

    ensureUser(userId : string){
        if(!this.userPosition.has(userId)){
            this.userPosition.set(userId , {
                market : "BTCUSDT",
                side : "UNINITIALIZED",
                quantity : 0,
                entryprice : 0,
                margin : 0,
                unrealizedpnl : 0,
                liquidationPrice : 0,
                leverage : 0
            })
        }
        if(!this.userBalance.has(userId)){
            this.userBalance.set(userId , {
                availableBalance : 100000,
                lockedBalance : 0
            })
        }
    }

    checkAndLockVBalance(
        userId : string,
        side : orderSide,
        entryprice : number,
        quantity : number,
        leverage :number
    ){
        const position = this.userPosition.get(userId);
        const balance = this.userBalance.get(userId);

        if(side === "LONG"){
            switch(position.side){
                case "LONG": {
                        const marginRequired = (entryprice * quantity)/leverage;
                        if(balance.availableBalance < marginRequired){
                            throw new Error("Insufficient balance");
                        }
                        balance.availableBalance -= marginRequired;
                        balance.lockedBalance += marginRequired;
                        break;
                    }
                case "SHORT":{
                        if(position.quantity < quantity){
                            const marginRequired = (entryprice * (quantity - position.quantity))/leverage;
                            if(balance.availableBalance < marginRequired){
                                throw new Error("Insufficient balance");
                            }
                            balance.availableBalance -= marginRequired;
                            balance.lockedBalance += marginRequired;
                        }else {
                            const marginRequired = (entryprice * quantity)/leverage;
                            balance.availableBalance += marginRequired;
                            balance.lockedBalance -= marginRequired;
                        }
                        break;
                    }
                case "UNINITIALIZED": {
                        const marginRequired = (entryprice * quantity)/leverage;
                        if(balance.availableBalance < marginRequired){
                            throw new Error("Insufficient balance");
                        }
                        balance.availableBalance += marginRequired;
                        balance.lockedBalance -= marginRequired;
                        break;
                    }
            }
        }else if(side === "SHORT"){
            switch(position.side){
                case "LONG" :{
                    if(position.quantity < quantity){
                        const marginRequired = (entryprice * (quantity - position.quantity))/leverage;
                        if(balance.availableBalance < marginRequired){
                            throw new Error("Insufficient balance");
                        }
                        balance.availableBalance -= marginRequired;
                        balance.lockedBalance += marginRequired;
                    }else {
                        const marginRequired = (entryprice * quantity)/leverage;
                        balance.availableBalance += marginRequired;
                        balance.lockedBalance -= marginRequired
                    }
                    break;
                } 
                case "SHORT" : {
                    const marginRequired = (entryprice * quantity)/leverage;
                    if(balance.availableBalance < marginRequired){
                        throw new Error("Insufficient balance");
                    }
                    balance.availableBalance += marginRequired;
                    balance.lockedBalance -= marginRequired;
                    break;
                }
                case "UNINITIALIZED" : {
                    const marginRequired = (entryprice * quantity)/leverage;
                    if(balance.availableBalance < marginRequired){
                        throw new Error("Insufficient balance");
                    }
                    balance.availableBalance += marginRequired;
                    balance.lockedBalance -= marginRequired;
                    break;
                }
            }
            
        }
    }

    updateuserPnl(
        fills : Fill[] , 
        executedQty : number,
        order : Order
    ){
        const position = this.userPosition.get(order.userId);
        const balance = this.userBalance.get(order.userId);

        if(!fills.length) return; 

        let totalPnl = 0;
        let totalClosedQty = 0;

        fills.forEach((fill) => {
            const closedQty = Math.min(fill.quantity , position.quantity - totalClosedQty)

            if(position.side === "LONG" && order.side === "SHORT"){
                totalPnl += (fill.price - position.entryprice) * closedQty;
                
            }else if(position.side === "SHORT" && order.side === "LONG"){
                 totalPnl += (position.entryprice - fill.price) * closedQty;
            }
            totalClosedQty += closedQty;
        })
        
        balance.availableBalance += (position.entryprice/position.leverage)*totalClosedQty + totalPnl;
        balance.lockedBalance -= (position.entryprice/position.leverage)*totalClosedQty;

    }

    updateuserPosition(
        fills : Fill[],
        executedQty : number,
        order : Order
    ){
        const position = this.userPosition.get(order.side);

        switch(position.side){
            case "LONG" :{
                if(order.side === "LONG"){
                    const oldNotional = position.entryprice * position.quantity;
                    const newNotional = order.entryprice * executedQty;
                    const totalQty = position.quantity + executedQty;
                    
                    position.quantity += executedQty;

                    //weighted average entry price
                    position.entryprice = (oldNotional + newNotional)/totalQty; 

                    const newMargin = (order.entryprice*executedQty)/order.leverage;
                    position.margin = newMargin;
                }else {

                    if(position.quantity < executedQty){

                        const remainingQty = executedQty - position.quantity;
                        position.side = "SHORT";
                        position.quantity =  remainingQty;
                        position.entryprice = order.entryprice ;
                        position.margin = (order.entryprice * remainingQty)/ order.leverage;
                        
                    }else if(position.quantity > executedQty){
                        const oldNotional = position.entryprice * position.quantity;
                        const newNotional = order.entryprice * executedQty;
                        const totalQty = position.quantity + executedQty;

                        position.quantity -= executedQty;
                        position.entryprice = (oldNotional - newNotional)/ totalQty;

                        const newMargin = (order.entryprice * executedQty)/order.leverage;
                        position.margin = position.margin - newMargin;

                    }else if(position.quantity === executedQty){
                        position.side = "UNINITIALIZED";
                        position.quantity = 0;
                        position.entryprice = 0;
                        position.margin = 0;
                    }

                }
                break;
            }

            case "SHORT" : {
                if(order.side === "SHORT"){
                    const oldNotional = position.entryprice * position.quantity;
                    const newNotional = order.entryprice * executedQty;
                    const totalQty = position.quantity + executedQty;

                    position.quantity += executedQty;
                    position.entryprice = (oldNotional + newNotional)/ totalQty;

                    const newMargin = (order.entryprice * executedQty)/order.leverage;
                    position.margin = newMargin;
                }else{

                    if(position.quantity < executedQty){

                        const reaminingQty = executedQty -position.quantity;
                        position.side = "LONG";
                        position.quantity = reaminingQty;
                        position.entryprice = order.entryprice;
                        position.margin = (order.entryprice*reaminingQty)/order.leverage

                    }else if(position.quantity > executedQty){

                        const oldNotional = position.entryprice * position.quantity;
                        const newNotional = order.entryprice * executedQty;
                        const totalQty = position.quantity + executedQty;

                        position.quantity -= executedQty;
                        position.entryprice = (oldNotional - newNotional)/totalQty;
                        
                        const newMargin = (order.entryprice * executedQty)/ order.leverage;
                        position.margin == position.margin - newMargin;
                        
                    }else if(position.quantity === executedQty){

                        position.side = "UNINITIALIZED";
                        position.quantity = 0;
                        position.entryprice = 0;
                        position.margin = 0;

                    }
                }
                break;
            }
            default : {
                if(position && executedQty){
                    position.side = order.side;
                    position.quantity += executedQty;
                    position.entryprice = order.entryprice
                    position.margin = (order.entryprice * executedQty)/order.leverage;
                }
                break;
            }
        }


        fills.forEach((fill) => {
            
        })
    }

}




