import { SubcriptionManager } from "@repo/event-queue";
import { emitTopOfBook } from "./marketDataBus.js";


export async function fetchTopOfBook(){
    SubcriptionManager.getInstance().subcribeToChannel('topOfBook:update', top => {
        emitTopOfBook(top);
    })
}