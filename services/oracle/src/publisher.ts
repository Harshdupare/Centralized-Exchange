import { RedisManager } from "@repo/event-queue";
import { onMarketDataUpdate } from "./marketDataBus.js";

onMarketDataUpdate(({ top, index }) => {
  try {
    const ask = parseInt(top.a[0]);
    const bid = parseInt(top.b[0]);

    const markPrice = medianOfThree(ask, bid, index);
    const fundingRate = calculateFundingRate(markPrice, index);

    RedisManager.getInstance().publishToChannel("markprice:update", markPrice);
    RedisManager.getInstance().publishToChannel("fundingrate:update", {
      fundingRate,
      markPrice
    })
  } catch (error) {
    console.log("Failed to update market data ", error);
  }
})

function medianOfThree(a: number, b: number, i: number) {
  const mn = Math.min(a, b, i);
  const mx = Math.max(a, b, i);

  return (a + b + i - mn - mx);
}

function calculateFundingRate(mark: number, index: number) {
  const initialRate = (mark - index) / index;
  const clamped = Math.max(Math.min(initialRate, 0.05), -0.05);
  const timeAdjustedFundingRate = clamped * (8 / 24);
  return timeAdjustedFundingRate;
}

