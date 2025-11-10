import EventEmitter from "events";


export interface topOfBook { a : [string , string] , b : [string, string]};
export type indexPrice = number;

const bus = new EventEmitter();

export function emitTopOfBook(top : topOfBook){
    bus.emit("top", top);
}

export function emitIndexPrice(index : indexPrice){
    bus.emit("index", index);
}

export function onMarketDataUpdate(
    handler : (data : {top : topOfBook , index : indexPrice}) => void
){
    let latestTop : topOfBook = null;
    let latestIndex : indexPrice = null;
    
    bus.on("top", (top) =>{
        latestTop = top;
        if(latestIndex){
            handler({top , index : latestIndex});
        }else {
            handler({top , index : 900000});
        }
    })

    bus.on("index", (index) =>{
        latestIndex = index;
        if(latestTop){
            handler({top : latestTop, index});
        }
    })
    
}
