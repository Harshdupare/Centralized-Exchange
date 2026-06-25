"use client";

import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";


const BinanceHeader = () => {
  const { data: session } = useSession();
  return (
    <header className="flex items-center justify-between border-b border-[#2A2A2A] p-5 h-16">
      <div className="flex items-center">
        <img src="https://public.bnbstatic.com/static/images/common/favicon.ico" alt="Binance" className="w-5 h-5 mr-2"></img>
        <span className="text-[#f0b90b] font-medium">BINANCE&nbsp;FUTURES</span>
      </div>
      <div className="flex items-center space-x-10 relative right-15">
        <a href="/trade" className="text-gray-500 hover:text-white text-sm" >Spot</a>
        <a href="/trade" className="text-gray-500 hover:text-white text-sm" >Futures</a>
        <a href="/trade" className="text-gray-500 hover:text-white text-sm" >Earn</a>
        <a href="/trade" className="text-gray-500 hover:text-white text-sm">NFT</a>
      </div>


      <div className="flex items-center space-x-4">
        {session ?
          <button
            className="bg-linear-to-r from-yellow-500 to-yellow-400 text-black text-shadow-black font-medium px-3 py-1.5 rounded-lg hover:shadow-lg hover:shadow-yellow-700/30 transition-all duration-300"
            onClick={() => { signOut() }}
          >Sign Out</button>
          :
          <button
            className="bg-linear-to-r from-yellow-500 to-yellow-400 text-black text-shadow-black font-medium px-3 py-1.5 rounded-lg hover:shadow-lg hover:shadow-yellow-700/30 transition-all duration-300"
            onClick={() => { signIn() }}
          >Sign In</button>
        }
      </div>
    </header>
  );
}

export default BinanceHeader;
