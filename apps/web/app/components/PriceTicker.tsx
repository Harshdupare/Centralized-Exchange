"use client";

import {useEffect, useState} from "react";
import {getCryptoData} from "../utils/mockData";
import {motion, AnimatePresence}from "framer-motion";


interface CryptoData {
    name        : string,
    price       : string,
    change      : string,
    type        : string,
    isPositive  : boolean
}

const PriceTicker = () => {
    const [price , setPrice] = useState<CryptoData[]>([]);

    useEffect(() => {
        setPrice(getCryptoData());

        const interval = setInterval(() => {
            setPrice(getCryptoData());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-effect py-8 border-t border-b border-gray-800/50">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                    <AnimatePresence>
                        {price.map((crypto , index) => (
                            <motion.div
                            key = {crypto.name}
                            initial = {{opacity : 0 , y : 20}}
                            animate = {{opacity : 1 , y : 0}}
                            transition = {{delay : index * 0.1}}
                                className = "flex flex-col backdrop-blur-lg rounded-lg p-4 hover:bg-gray-700/20 transition-all duration-300"
                                >   
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-display text-sm text-gray-300">{crypto.name}</span>
                                    <motion.span
                                        initial = {{scale  : 1}}
                                        animate = {{scale : [1 , 1.1 , 1]}}
                                        className = {`text-sm font-medium px-2 py-1 rounded-full
                                            ${crypto.isPositive ? "bg-green-500/20 text-green-400"  : "bg-red-500/20 text-red-400"}`
                                        }
                                        >
                                        {crypto.change}
                                    </motion.span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="font-display font-medium text-lg">{crypto.price}</span>
                                    <span className="text-sm text-gray-400 font-medium ">{crypto.type}</span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default PriceTicker;