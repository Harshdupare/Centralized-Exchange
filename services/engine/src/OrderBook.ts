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
            // check for same user
            if(this.asks[i].userId === order.userId){
                continue;
            }
            // check if listed price is greater than or equal to order entryprice and executedQty is less than order qty
            if(this.asks[i].entryprice >= order.entryprice && executedQty < order.quantity){
                // take min of listed qty and diff. of order qty and executed qty
                // so that only remaining qty should be executed 
                const trade = Math.min(this.asks[i].quantity , order.quantity - executedQty);
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
        // if order is filled and completely executed remove from the list
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
                let trade = Math.min(this.bids[i].quantity, order.quantity - executedQty);
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
    

    //  
    getMarketDepth(){
        const bidDepth = this.aggregatedByPrice(this.bids, true);
        const askDepth = this.aggregatedByPrice(this.asks, false);

        return {
            bid : bidDepth,
            ask : askDepth
        }
    }

    aggregatedByPrice(orders : Order[] , descending : boolean){
        let priceMap = new Map();

        orders.forEach((e) => {
            if(e.quantity > 0){
                priceMap.set(e.entryprice , (priceMap.get(e.entryprice) || 0) + e.quantity);
            }
        })
        const entries = Array.from(priceMap.entries())

        return entries.sort((a, b) => descending ? b[0] - a[0] : a[0] - b[0]);
    }

    getOpenOrders(userId : string){
        const bids = this.bids.filter((bid) => bid.userId === userId);
        const asks = this.asks.filter((ask) => ask.userId === userId);

        return [...bids , ...asks];
    }


    // the best price that will be needed to fill the entire quantity per (share/qty)
    getBestOppositePrice(side : orderSide, qauntity : number){
        let bestprice;
        let fillQuantity = 0;

        if(side === "LONG"){
            for(let i = 0 ; i < this.asks.length ; i++){
                fillQuantity += this.asks[i].quantity;
                if(fillQuantity >= qauntity){
                    bestprice = this.asks[i].entryprice;
                    break;
                }
            }    
        }else{    
            for(let i = 0 ; i < this.bids.length ; i++){
                fillQuantity += this.bids[i].quantity;
                if(fillQuantity >= qauntity){
                    bestprice = this.bids[i].entryprice;
                    break;
                }
            }
        }    

        return bestprice;   
    }
}