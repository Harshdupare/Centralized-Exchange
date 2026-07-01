"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useWebSocket from "../hooks/useWebSocket";
import axios from "axios";

const OrderEntry: React.FC = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id

  const [orderType, setOrderType] = useState('LIMIT-CREATE');
  const [size, setSize] = useState('1');
  const [price, setPrice] = useState('95000');
  const [balance, setBalance] = useState(0);
  const { isConnected, subscribe, unsubscribe, message } = useWebSocket({ url: process.env.NEXT_PUBLIC_WSS_URL! });

  const handlePlaceOrder = async (OrderSide: string) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API}/order/create`, {
        userId: userId,
        market: "BTCUSDT",
        entryPrice: Number(price),
        size: Number(size),
        type: orderType,
        side: OrderSide,
        leverage: "1"
      });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    console.log(userId, " ", `${process.env.NEXT_PUBLIC_API}/balance/${userId}`);
    const fetchBalance = async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API}/balance/${userId}`);
      setBalance(res.data.balance);
    }
    fetchBalance();
  }, [userId]);

  useEffect(() => {
    if (isConnected) {
      subscribe(`balance@${userId}`, (data) => setBalance(data.data.a))
    }
  }, [isConnected, subscribe, unsubscribe, userId]);

  return (
    <div className="">
      <h3 className="">
        Place Order
      </h3>

      <div className="">
        <div className="">
          <div className="">
            <div className="">
              <span>Balance</span>
              <span>{Number(balance)}</span>
              <div className="" />
            </div>
          </div>
        </div>
      </div>



    </div>
  );
}

export default OrderEntry;




