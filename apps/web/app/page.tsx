import React from "react";
import BinanceHeader from "./components/Header";
import Hero from "./components/Hero";
import PriceTicker from "./components/PriceTicker";


const page = () =>{
  return(
    <div className="min-h-screen bg-black text-white flex flex-col">
        <BinanceHeader/>
        <main className="grow">
            <Hero/>
            <PriceTicker/>
        </main>
        
        <footer>todo : footer</footer>

    </div>
  );
}

export default page;
