"use client";


import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";




export default function LightweightCandlestickChart({
  width = "100%",
  height = "500px",
  tf
}: {
  width: string,
  height: string,
  tf: string
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current == null) return;

    try {
      const container = containerRef.current;
      const chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
          background: {
            // type: 'solid', 
            color: '#000000'
          },
          // backgroundColor: '#000000',
          textColor: '#8A8A8A',
        },
        grid: {
          vertLines: { color: '#333333', style: 1 },
          horzLines: { color: '#333333', style: 1 },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#000000',
          // backgroundColor: '#000000',
        },
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#2EBD85',
        downColor: '#F6465D',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
      });

      const handleResize = () => {
        chart.resize(container.clientWidth, container.clientHeight);
      }


        ; (async () => {
          const realData = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${tf}`
          ).then(r => r.json())
          // transform the array of arrays into { time, open, high, low, close }
          const chartData = realData.map((c: any) => ({
            time: c[0] / 1000,
            open: +c[1],
            high: +c[2],
            low: +c[3],
            close: +c[4],
          }))
          candleSeries.setData(chartData)
        })()


      const wsUrl = `wss://fstream.binance.com/market/ws/btcusdt_perpetual@continuousKline_${tf}`

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => { console.log("connected to kline stream") };


      ws.onmessage = (raw) => {

        const data = JSON.parse(raw.data).k;

        const chartData: any = {
          time: data.t / 1000,
          open: Number(data.o),
          high: Number(data.h),
          low: Number(data.l),
          close: Number(data.c)
        };

        candleSeries.update(chartData)


        window.addEventListener("resize", handleResize);

      };

      /*
      const handleResize = () => {
        chart.resize(container.clientWidth, container.clientHeight);
      }
      window.addEventListener("resize", handleResize);
      */
      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      }

    } catch (error) {
      console.log(error);
    }

  }, [tf]);

  return (
    <div className="chart-wrapper" style={{ width, height, backgroundColor: '#000000', padding: 0, margin: 0 }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
      </div>
    </div>
  );
}
