export type orderType = "MARKET-CREATE" | "LIMIT-CREATE" | "LIMIT-CANCEL" | "MARKET-LIQUIDATION";
export type orderSide = "LONG" | "SHORT" | "UNINITIALIZED";

export interface Order {
    id          : string,
    userId      : string,
    market?      : "BTCUSDT",
    entryprice  : number,
    quantity    : number,
    type        : orderType,
    side        : orderSide
    leverage    : number,
    filled      : number
}

export interface MarketOrder {
    id          : string,
    userId      : string,
    market?      : "BTCUSDT",
    quantity    : number,
    type        : orderType,
    side        : orderSide,
    leverage    : number,
    filled      : number
}

export interface UserPosition {
    market              : "BTCUSDT",
    side                : orderSide,
    quantity            : number,
    entryprice          : number,
    margin              : number,  // capital used in trade
    unrealizedpnl       : number,
    liquidationPrice    : number,
    leverage?           : number
}

export interface UserBalance {
    availableBalance : number,  // this is available balance for used for trade
    lockedBalance    : number  // this is the collateral against leevrage
}

export interface Fill {
    fillId          : string,
    orderId         : string,
    otherOrderId    : string,
    userId          : String,
    otherUserId     : String,
    price           : number,
    quantity        : number,
    side?           : orderSide
}