import { s3manager } from "./S3manager.js";
import { OrderBook } from "./OrderBook.js";
import { UserBalance , UserPosition, Order, orderSide, orderType ,Fill } from "@repo/types";
import { eventQueue , RedisManager } from "@repo/event-queue";
import { Worker } from "bullmq";
import {v4 as uuidv4} from "uuid";

import dotenv from "dotenv";
import path from "path";

const directoryPath = import.meta.dirname;

dotenv.config({
    path : path.resolve(directoryPath , "../../../.env")
}) 

const ENGINE_KEY = "process.env.ENGINE_KEY";

export class Engine{
    public static instance : Engine | null; 
    private orderBook : OrderBook | null;
    private userPosition : Map<String, UserPosition> = new Map();
    private userBalance : Map<String , UserBalance> = new Map();


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
                port : parseInt(process.env.REDIS_PORT as string),
                host : process.env.REDIS_HOSTS
            }
        })
    }

    applyFunding(fundingRate : number , marketPrice : number){
        for(const positions of this.userPosition.values()){
            const side = positions.side;
            const fundingCharge = positions.quantity * marketPrice * fundingRate;

            if(side === "UNINITIALIZED") continue;

            if(fundingRate > 0){ // LONG Pays
                if(side === "LONG"){
                    positions.margin -= Math.abs(fundingCharge);
                }else{
                    positions.margin += Math.abs(fundingCharge);
                }
            }else{ // SHORT Pays
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
                    );
                }catch(error){
                    console.log("Failed to create Limit order : ", error);
                }

                break;

            }
            case "MARKET-CREATE" : {
                try{
                    this.createMarketOrder(
                        order.userId,
                        order.quantity,
                        order.side,
                        order.leverage,
                        order.type 
                    );
                }catch(error){
                    console.log("Failed to create market order : " , error);
                }

                break;

            }
            case "MARKET-LIQUIDATION" : {
                try{
                    this.createMarketOrder(
                        order.userId,
                        order.quantity,
                        order.side,
                        order.leverage,
                        order.type 
                    );
                }catch(error){
                    console.log("Failed to create market order : " , error);
                }

                break;
            
            }
            case "LIMIT-CANCEL" : {
                try{
                    this.orderBook?.cancelOrder(order.id, order.userId);

                    const reaminingQty = order.quantity - order.filled;
                    const balance = this.userBalance.get(order.userId);

                    if(balance){
                        balance.availableBalance += reaminingQty*order.entryprice / order.leverage;
                        balance.lockedBalance -= reaminingQty*order.entryprice / order.leverage;
                    }

                    this.publishUserBalance(order.userId);
                    this.publishOrderCancelled(order);
                    this.updateRedisBalance(order.userId);
                    this.updateRedisDepth();
                    this.cancleRedisOrder(order);

                    console.log("Order Cancelled");

                }catch(error){
                    console.log("Failed to cancel order : " , error);
                }

                break;

            }
        }

        this.updateTopOfBook();
        this.positionUpdateForLiquidation();

        console.log("order is processed");

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
            this.checkAndLockBalance(
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

            const {executedQty , fills} = this.orderBook?.addOrder(order)!;

            this.updateuserPnl(fills, executedQty , order);
            this.updateUserPosition(fills , executedQty, order);
            this.publishUserBalance(order.userId);
            this.publishDepth();
            this.publishLastTrade(fills);

            this.updateRedisBalance(order.userId);
            this.updateRedisDepth();
            this.updateRedisOrder({ ...order , filled : executedQty});
            this.updateRedisFills(fills , order);
            this.updateRedisUserPosition(fills , order);
            console.log(executedQty, order);
        }catch(error){
            throw new Error("Failed to Create limit order");
        }
        
    }

    createMarketOrder( 
        userId : string,
        quantity : number,
        side : orderSide,
        leverage : number,
        type : orderType
    ){

        try{

            const referencePrice = this.orderBook?.getBestOppositePrice(side , quantity);
            
            if(!referencePrice){
                throw new Error("No reference price were found");
            }
            this.checkAndLockBalance(userId, side , referencePrice , quantity , leverage);
            
            const orderId = uuidv4();
            
            const order = {
                id : orderId,
                userId,
                entryprice : referencePrice,
                quantity,
                type,
                side,
                leverage,
                filled : 0,
            }
            
            const {executedQty , fills} = this.orderBook?.addOrder(order)!;

            this.updateuserPnl(fills, executedQty , order);
            this.updateUserPosition(fills , executedQty, order);
            this.publishUserBalance(order.userId);
            this.publishDepth();
            this.publishLastTrade(fills);

            this.updateRedisBalance(order.userId);
            this.updateRedisDepth();
            this.updateRedisOrder({ ...order , filled : executedQty});
            this.updateRedisFills(fills , order);
            this.updateRedisUserPosition(fills , order);
            console.log(executedQty, order);
        }catch(error){
            throw new Error("Failed to create market order ");
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

    checkAndLockBalance(
        userId : string,
        side : orderSide,
        entryprice : number,
        quantity : number,
        leverage :number
    ){
        const position = this.userPosition.get(userId)!;
        const balance = this.userBalance.get(userId)!;

        if(side === "LONG"){
            switch(position?.side){
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
        const position = this.userPosition.get(order.userId)!;
        const balance = this.userBalance.get(order.userId)!;

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
        
        balance.availableBalance += (position.entryprice/order.leverage)*totalClosedQty + totalPnl;
        balance.lockedBalance -= (position.entryprice/order.leverage)*totalClosedQty;

    }

    updateUserPosition(
        fills : Fill[],
		executedQty : number,
		order : Order
	){
		let position = this.userPosition.get(order.userId)!;

		switch(position.side){
			case "LONG" : {
				if(order.side === "LONG"){
					const oldNotional = position.entryprice * position.quantity;
					const newNotional = order.entryprice * executedQty;
					const totalQty = position.quantity + executedQty;
					
					position.quantity += executedQty;
					position.entryprice = (oldNotional + newNotional)/totalQty;

					const newMargin = (order.entryprice * executedQty)/order.leverage;
					position.margin += newMargin;
				}else{
					if(position.quantity < executedQty){
						const remainingQty = executedQty - position.quantity;
						position.side = "SHORT"
						position.quantity = remainingQty
						position.entryprice = order.entryprice
						position.margin = (order.entryprice * remainingQty) / order.leverage
					}else if(position.quantity > executedQty){
						const oldNotional = position.entryprice * position.quantity;
						const newNotional = order.entryprice * executedQty;
						const remainingQty = position.quantity - executedQty;

						position.quantity -= executedQty;
						position.entryprice = (oldNotional + newNotional) / remainingQty;

						const newMargin = (order.entryprice * executedQty) / order.leverage;
						position.margin -= newMargin; 
					}else if (position.quantity === executedQty){
						position.side = "UNINITIALIZED"
						position.quantity = 0;
						position.margin = 0
						position.entryprice = order.entryprice
					}
				}
				break;
			}
			case "SHORT" : {
				if(order.side === "SHORT"){
					const oldNotional = position.entryprice * position.quantity;
					const newNotional = order.entryprice * executedQty;
					const totalQty = position.quantity + executedQty;

					position.quantity += totalQty;
					position.entryprice = (oldNotional + newNotional)/totalQty;

					const newMargin = (order.entryprice * executedQty)/order.leverage;
					position.margin += newMargin;
				}else {
					if(position.quantity > executedQty){
						const remainingQty = position.quantity - executedQty;
						position.side = "LONG";
						position.quantity = remainingQty;
						position.entryprice = order.entryprice;
						position.margin = (order.entryprice * executedQty)/order.leverage
					}else if(position.quantity < executedQty){
						const oldNotional = position.entryprice * position.quantity;
						const newNotional = order.entryprice * executedQty;
						const remainingQty = executedQty - position.quantity;

						position.quantity -= executedQty;
						position.entryprice = (oldNotional + newNotional)/remainingQty;

						const newMargin = (order.entryprice * executedQty)/order.leverage;
						position.margin -= newMargin;
					}else if(position.quantity === executedQty){
						position.side = "UNINITIALIZED";
						position.entryprice = 0;
						position.quantity = 0;
						position.margin = 0;
					}

				}
				break;
			}
			default : {
				if(position && executedQty){
					position.quantity += executedQty;
					position.entryprice = order.entryprice;
					position.side = order.side;
					position.margin = (order.entryprice * order.quantity)/order.leverage;
				}
				break;
			}
		}

		fills.forEach(fill => {
			const position = this.userPosition.get(fill.otherUserId)!;

			switch(position.side){
				case "LONG" : {
					if(fill.side === "LONG"){
						const oldNotional = position.entryprice * position.quantity;
						const newNotional = fill.price * fill.quantity;
						const totalQty = position.quantity + fill.quantity;

						position.quantity += fill.quantity;
						position.entryprice = (oldNotional + newNotional)/totalQty;

						const newMargin = (fill.price * fill.quantity)/order.leverage;
						position.margin += newMargin;
					}else{
						if(position.quantity > fill.quantity){
							const remainingQty = position.quantity - fill.quantity;
							position.side = "SHORT";
							position.quantity = remainingQty;
							position.entryprice = fill.price;
							position.margin = (fill.price * fill.quantity)/order.leverage;
						}else if(position.quantity < fill.quantity){
							const oldNotional = position.entryprice * position.quantity;
							const newNotional = fill.price * fill.quantity;
							const remainingQty = position.quantity + fill.quantity;

							position.quantity -= fill.quantity;
							position.entryprice = (oldNotional + newNotional)/remainingQty;
							
							const newMargin = (fill.price * fill.quantity)/order.leverage;
							position.margin -= newMargin;
						}else if(position.quantity === fill.quantity){
							position.side = "UNINITIALIZED";
							position.quantity = 0;
							position.entryprice = 0;
							position.margin = 0;
						}
					}
					break;
				}
				case "SHORT" : {
					if(fill.side === "SHORT"){
						const oldNotional = position.entryprice * position.quantity;
						const newNotional = fill.price * fill.quantity;
						const totalPnl = position.quantity + fill.quantity;

						position.quantity += fill.quantity;
						position.entryprice = (oldNotional + newNotional)/totalPnl;

						const newMargin = (fill.price * fill.quantity)/order.leverage;
						position.margin += newMargin;
					}else{
						if(position.quantity > fill.quantity){
							const remainingQty = position.quantity - fill.quantity;
							position.side = "LONG";
							position.quantity = remainingQty;
							position.entryprice = fill.price;
							position.margin = (fill.price * fill.quantity)/order.leverage;
						}else if(position.quantity < fill.quantity){
							const oldNotional = position.entryprice * position.quantity;
							const newNotional = fill.price * fill.quantity;
							const remainingQty = fill.quantity - position.quantity;

							position.quantity -= fill.quantity;
							position.entryprice = (oldNotional + newNotional)/remainingQty;
							
							const newMargin = (fill.price * fill.quantity)/order.leverage;
							position.margin -= newMargin;
						}else if(position.quantity === fill.quantity) {
							position.side = "UNINITIALIZED";
							position.quantity = 0;
							position.entryprice = 0;
							position.margin = 0;
						}
					}
					break;
				}
				default : {
					if(position && fill.quantity){
						position.side = fill.side!;
						position.quantity += fill.quantity;
						position.entryprice = fill.price;
						position.margin = (fill.price * fill.quantity)/order.leverage;
					}
					break;
				}
			}
		})

	}

    publishUserBalance(userId : string){
        const balance = this.userBalance.get(userId)!;

        RedisManager.getInstance().publishToChannel(`balance@${userId}` , {
            data : {
                a : balance.availableBalance,
                l : balance.lockedBalance
            }
        })
    }

    publishLastTrade(fills : Fill[]){
        const lastFill = fills[fills.length -1]!;
        RedisManager.getInstance().publishToChannel(`trade:update`, {
            data : {
                p : lastFill.price,
                q : lastFill.quantity
            }
        })
    }

    publishDepth(){
        const {asks ,bids} = this.orderBook?.getMarketDepth()!;

        RedisManager.getInstance().publishToChannel(`depth:update`, {
            data : {
                a : asks,
                b : bids 
            }
        })
    }

    updateRedisBalance(userId : string){
        const balance = this.userBalance.get(userId)!;
        eventQueue.add("update_balance", {
            type : "BALANCE_UPDATE", 
            data : {
                userId,
                balance : balance.availableBalance
            }
        })
    }

    updateRedisDepth(){
        const {asks, bids} = this.orderBook?.getMarketDepth()!;
        eventQueue.add("update_depth", {
            type : "DEPTH_UPDATE",
            data : {
                asks,
                bids
            }
        })
    }

    updateRedisOrder(order : Order){
        eventQueue.add("updatd_order" , {
            type : "ORDER_UPDATE",
            data : order
        })
    }

    updateRedisFills(fills : Fill[], order : Order){
        fills.forEach((fill) =>{
            eventQueue.add("update_fills", {
                type : "FILL_UPDATE",
                data : {
                    ...fill,
                    userId : order.userId
                }
            })
        })
    }

    updateRedisUserPosition(fills : Fill[], order : Order){
        const position = this.userPosition.get(order.userId);
        eventQueue.add("update_position", {
            type : "POSITION_UPDATE",
            data : {
                ...position,
                userId : order.userId
            }
        })

        fills.forEach((fill) =>{
            const position = this.userPosition.get(fill.otherUserId)!;
            eventQueue.add("update_fills", {
                type : "POSITION_UPDATE",
                data : {
                    ...position,
                    userId : fill.otherUserId
                }
            })
        })

    }
    
    updateTopOfBook(){
        const {asks , bids} = this.orderBook?.getMarketDepth()!;
        RedisManager.getInstance().publishToChannel(`topOfBook:update`, {
            data : {
                a : asks[0],
                b : bids[0]
            }
        })
    }

    positionUpdateForLiquidation(){
        const payload = Array.from(this.userPosition.entries()).map(([userId , position]) => (
            {userId , ...position, leverage : position.leverage}
        ))

        RedisManager.getInstance().publishToChannel(`position:update`, {
            data : payload
        })
        
    }

    cancleRedisOrder(order : Order){
        eventQueue.add("cancel_order", {
            type : "CANCEL_ORDER",
            data : {
                orderId: order.id
            }
        })
    }

    publishOrderCancelled(order : Order){
        RedisManager.getInstance().publishToChannel(`order:cancelled` , {
            data : {
                orderId : order.id
            }
        })
    }

}
