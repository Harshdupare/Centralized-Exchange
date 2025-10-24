import {Order , orderSide , Fill} from "@repo/types"
import {v4 as uuidv4} from "uuid";

export class OrderBook {
    asks    : Order[];
    bids    : Order[];
    market  : string;
    
    constructor(
        asks : [],
        bids : [],
        market : "BTCUSDT"
    ){
        this.asks = asks;
        this.bids = bids;
        this.market = market;
        this.sortOrders();
    }

    getSnapshot(){
        return {
            asks    : this.asks,
            bids    : this.bids,
            market  : this.market 
        }
    }

    private sortOrders(){
        this.asks.sort((a,b) => a.entryprice - b.entryprice);
        this.bids.sort((a,b) => b.entryprice - a.entryprice);
    }

    addOrder(order : Order){
        if(order.side === "LONG"){
            let {executedQty , fills} = this.matchBids(order);

            if(executedQty  < order.quantity){
                this.bids.push({... order , filled : executedQty})
                this.sortOrders();
            }
            return {executedQty , fills};
        }else{
            let {executedQty , fills} = this.matchAsks(order);

            if(executedQty < order.quantity){
                this.asks.push({...order, filled : executedQty});
                this.sortOrders();
            }
            return {executedQty , fills};
        }
    }


    matchBids(order : Order){
        let executedQty = 0;
        let fills : Fill[] = [];

        for(let i = 0 ; i < this.asks.length ; i++){
            if(this.asks[i].userId === order.userId){
                continue;
            }
            if(this.asks[i].entryprice >= order.entryprice && executedQty < order.quantity){
                const trade = Math.min(this.asks[i].entryprice , order.entryprice - executedQty);
                executedQty += trade;

                if(this.asks[i]){
                    if(this.asks[i].filled === undefined){
                        this.asks[i].filled = 0;
                    }
                    this.asks[i].filled += trade;
                }

                fills.push({
                    fillId : uuidv4(),
                    orderId : order.id,
                    otherOrderId : this.asks[i].id,
                    userId : order.userId,
                    otherUserId : this.asks[i].userId,
                    price : order.entryprice,
                    quantity : trade,
                    side : order.side
                })
            }
        }
        this.asks = this.asks.filter((ask) => ask.filled < ask.quantity)

        return {executedQty , fills};
    }

    matchAsks(order : Order){
        let executedQty = 0;
        let fills : Fill[] = [];
        
        for(let i = 0 ; i < this.bids.length ; i++){
            if(this.bids[i].userId === order.userId){
                continue;
            }

            if(this.bids[i].entryprice >= order.entryprice && executedQty < order.quantity){
                let trade = Math.min(this.bids[i].entryprice, order.quantity - executedQty);
                executedQty += trade;

                if(this.bids[i]){
                    if(this.bids[i].filled === undefined){
                        this.bids[i].filled = 0;
                    }
                    this.bids[i].filled += trade;
                }

                fills.push({
                    fillId : uuidv4(),
                    orderId : order.id,
                    otherOrderId : this.bids[i].id,
                    userId : order.id,
                    otherUserId : this.bids[i].userId,
                    price : order.entryprice,
                    quantity : trade ,
                    side : order.side
                })
            }
        }
        this.bids = this.bids.filter((bid) => bid.filled < bid.quantity);
        return {executedQty , fills};
    }

    cancelOrder(orderId : string , userId : string){
        const bidIndex = this.bids.findIndex((b) => b.id === orderId && b.userId === userId);
        if(bidIndex !== -1 ){
            this.bids.splice(bidIndex , 1);
            console.log("Order Cancelled");
        }

        const askIndex = this.asks.findIndex((a) => a.id === orderId && a.userId === userId);
        if(askIndex !== -1){
            this.asks.splice(askIndex, 1);
            console.log("Order Cancelled");
        }
    }
    

    // TODO : 
    getMarketDepth(){

    }
    aggregatedByPrice(){

    }

    getOpenOrders(){

    }

    getBestOppositePrice(){

    }
}