import React from "react";

import Header from "../components/Header";
import MarketTabs from "../components/MarketTabs";
import ChartSection from "../components/ChartSection";

const Trade: React.FC = () => {
  return (
    <div className="">
      <div className="h-screen flex flex-col overflow-hidden bg-[#0B0B0B] text-white">

        <Header />
        <MarketTabs />
        <div className="flex flex-1 overflow-hidden">
          <ChartSection />
        </div>
      </div>
    </div>
  );
}

export default Trade;
