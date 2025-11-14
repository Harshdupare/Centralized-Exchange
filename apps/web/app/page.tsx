import React from "react";
import BinanceHeader from "./components/Header";
import Hero from "./components/Hero";


const page = () =>{
  return(
    <div className="min-h-screen bg-black text-white flex flex-col">
        <BinanceHeader/>
        <main className="grow">
            <Hero/>
            ticker
        </main>
        
        <footer>footer</footer>

    </div>
  );
}

export default page;
