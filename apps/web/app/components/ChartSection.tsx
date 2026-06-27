
import { subscribe, unsubscribe } from "diagnostics_channel";
import React, { useCallback } from "react";

const timeFrames = ['15m', '1H', '4H', '1D', '1W'];
const viewTypes = ["Original", "Trading View", "Depth"];

const ChartSection: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState("15m");
  const [activeView, setActiveView] = useState("Original");
  const [indexPrice, setIndexPrice] = useState(0);
  const [markPrice, setMarkPrice] = useState(0);
  const [fundingRate, setFundingRate] = useState(0);
  const pad = (n: number) => n.toString().padStart(2, '0');


  const handlePriceUpdate = useCallback((data: any) => {

  }, []);


  useEffect(() => {
    console.log("isConnected", isConnected);

    if (isConnected) {
      subscribe("prices:update", handlePriceUpdate);
    }

    return () => {
      unsubscribe("prices:update");
    }
  }, []);

  return (
    <div className="">

    </div>
  );
}

export default ChartSection;
