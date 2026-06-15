import { fundingQueue } from "@repo/event-queue";
import { SubcriptionManager } from "@repo/event-queue";
import { CronJob } from "cron";

let latestMarkPrice : number | null = null;
let latestFundingRate : number | null = null;

SubcriptionManager.getInstance().subscribeToChannel("fundingrate:update", ({fundingRate, markPrice} : {fundingRate : number , markPrice : number}) => {
    latestFundingRate = fundingRate;
    latestMarkPrice = markPrice;
}) 

const cron = new CronJob(
    '0 0,8,16 * * *' ,
    () => {
        console.log("cron job is running");
        fundingQueue.add("fundingrate:update", {
            data : {
                latestFundingRate,
                latestMarkPrice
            }
        })
    },
    null, // onComplete : func call when job is completed . stopped
    true, // start : whether to start job imediately
    "Asia/Kolkata" // timeZone
);

cron.start();
