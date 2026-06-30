"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import useWebSocket from "../hooks/useWebSocket";

const OrderEntry: React.FC = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id

  const [orderType, setOrderType] = useState('LIMIT-CREATE');
  const [size, setSize] = useState('1');
  const [price, setPrice] = useState('95000');
  const [balance, setbalance] = useState(0);
  const { isConnected, subscribe, unsubscribe, message } = useWebSocket({ url: process.env.NEXT_PUBLIC_WSS_URL! });

  const handlePlaceOrder = () => {

  }


  return (
    <div className="">

    </div>
  );
}

export default OrderEntry;




