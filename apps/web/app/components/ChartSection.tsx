"use client";


import React, { useCallback, useState, useEffect } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import useNextCutOffCountdown from "../hooks/useNextCutOffCountdown";



const timeFrames = ['15m', '1H', '4H', '1D', '1W'];
const viewTypes = ["Original", "Trading View", "Depth"];

const ChartSection: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState("15m");
  const [activeView, setActiveView] = useState("Original");
  const [indexPrice, setIndexPrice] = useState(0);
  const [markPrice, setMarkPrice] = useState(0);
  const [fundingRate, setFundingRate] = useState(0);
  const [market, SetMarket] = useState("MARKET");
  const pad = (n: number) => n.toString().padStart(2, '0');
  const { subscribe, unsubscribe, isConnected } = useWebSocketContext();
  const { hours, minutes, seconds } = useNextCutOffCountdown();

  const handlePriceUpdate = useCallback((data: any) => {
    // console.log("data", data);

    const parseData = data;
    const markPrice = parseFloat(parseData.p).toFixed(1);
    const indexPrice = parseFloat(parseData.i).toFixed(1);
    const fundingRate = (parseFloat(parseData.r) * 100).toFixed(4);

    setMarkPrice(Number(markPrice));
    setIndexPrice(Number(indexPrice));
    setFundingRate(Number(fundingRate));
    SetMarket(parseData.s.toUpperCase());
  }, []);


  useEffect(() => {
    console.log("isConnected", isConnected);

    if (isConnected) {
      subscribe("prices:update", handlePriceUpdate);
    }

    return () => {
      unsubscribe("prices:update");
    }
  }, [isConnected, subscribe, unsubscribe, handlePriceUpdate]);

  return (
    <div className="w-4/5 border-r border-[#2A2A2A] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-r border-[#2A2A2A]">
        <div className="flex items-center">
          <div className="mr-4">
            <div className="flex items-center">
              <span className="font-bold text-lg mr-2">{market}</span>
              <span className="text-sm text-gray-400">Perps</span>

              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>

              <div className="flex text-sm mt-1">
                <span className="text-[#0ECB81]">{markPrice}</span>
              </div>

            </div>

            <div className="flex space-x-6 text-xs text-gray-400">

              <div className="flex flex-col items-center p-2 bg-[#121212] rounded-lg min-w-[100px]">
                <div className="text-[#8A8A8A] mb-1">Mark</div>
                <div className="text-[#0ECB81] font-medium text-sm">${markPrice}</div>
              </div>
              <div className="flex flex-col items-center p-2 bg-[#121212] rounded-lg min-w-[100px]">
                <div className="text-[#8A8A8A] mb-1">Index<sup>*</sup></div>
                <div className="text-[#0ECB81] font-medium text-sm">${indexPrice}</div>
              </div>
              <div className="flex flex-col items-center p-2 bg-[#121212] rounded-lg min-w-[100px]">
                <div className="text-[#8A8A8A] mb-1">Funding Rate</div>
                <div className={`font-medium text-sm ${fundingRate < 0 ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>{fundingRate}%</div>
              </div>
              <div className="flex flex-col items-center p-2 bg-[#121212] rounded-lg min-w-[100px]">
                <div className="text-[#8A8A8A] mb-1">Countdown</div>
                <div className="text-[#0ECB81] font-medium text-sm">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</div>
              </div>
              <div className="flex flex-col items-center p-2 bg-[#121212] rounded-lg min-w-[100px]">
                <div className="text-[#8A8A8A] mb-1">24h High</div>
                <div className="text-[#0ECB81] font-medium text-sm">$94,092.2</div>
              </div>
              <div className="flex flex-col items-center p-2 bg-[#121212] rounded-lg min-w-[100px]">
                <div className="text-[#8A8A8A] mb-1">24h Low</div>
                <div className="text-[#F6465D] font-medium text-sm">$84,914.4</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ChartSection;
