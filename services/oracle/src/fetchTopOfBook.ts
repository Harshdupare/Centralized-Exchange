import { SubcriptionManager } from "@repo/event-queue";
import { emitTopOfBook, topOfBook } from "./marketDataBus.js";


export async function fetchTopOfBook(){
    SubcriptionManager.getInstance().subscribeToChannel('topOfBook:update', (top : topOfBook) => {
        emitTopOfBook(top);
    })
}