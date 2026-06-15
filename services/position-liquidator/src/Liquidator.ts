import { SubcriptionManager } from "@repo/event-queue";
import { liquidationQueue } from "@repo/event-queue";
import { UserPosition } from "@repo/types";


export class Liquidator{
    private latestMarkPrice : number = 0;
    private UserPosition = new Map<string , UserPosition>();
    private MAINTENENCE_MARGIN = 0.05;

    constructor(){
        const subscribe = SubcriptionManager.getInstance();

        subscribe.subscribeToChannel("markprice:update", ({markPrice} : {markPrice : number})=>{
            this.latestMarkPrice = markPrice;
            this.checkAllPositions();
        })

        subscribe.subscribeToChannel("position:update", ({positions} : {positions : any})=>{
            this.UserPosition.clear();
            for(const [userId, position] of positions){
                this.UserPosition.set(userId , position);
            }
            this.checkAllPositions();
        })
    }

    checkAllPositions(){
        for(const [userId, position] of this.UserPosition){
            const  liquidationQty = this.computeLiquidationQty(position, this.latestMarkPrice);

            if(liquidationQty && liquidationQty > 0){
                this.enqueueLiquidation(userId, position , liquidationQty);
            }
        }
    }

    computeLiquidationQty(position : any, latestMarkPrice : number){
        const notional = position.entryprice * position.quantity;
        const pnl = (latestMarkPrice - position.entryprice) * position.quantity;
        const equity = position.margin + pnl;
        const req = this.MAINTENENCE_MARGIN * notional;
        const shortfall = req - equity;

        if(!shortfall){
            return null;
        }

        if(shortfall === req){
            const liquidationQty = position.quantity;
            return liquidationQty;
        }

        if(shortfall < req){
            const liquidationQty = position.quantity * (equity/req);
            return liquidationQty;
        }
        return null;
    }

    enqueueLiquidation(userId : string , position : UserPosition, liquidationQty : number){
        liquidationQueue.add("liquidate_order", {
            data : {
                ...position,
                userId,
                liquidationQty
            }
        })
    }

}
