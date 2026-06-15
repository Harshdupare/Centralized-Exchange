export interface cryptoData {
    name : string,
    price : string,
    change : string,
    type : string,
    isPositive : boolean
}

export const getCryptoData = () => {

    const randomChange = () => {
        const isPositive = Math.random() > 0.5;
        const change = (Math.random() * 5).toFixed(2);
        return {
            change : `${isPositive ? '+' : '-'}${change}%`,
            isPositive
        }
    }

    return [
    {
      name: 'BTCUSDT',
      price: '93,837',
      ...randomChange(),
      type: 'Perpetual'
    },
    {
      name: 'ETHUSDT',
      price: '1,770.74',
      ...randomChange(),
      type: 'Perpetual'
    },
    {
      name: 'SOLUSDT',
      price: '152.51',
      ...randomChange(),
      type: 'Perpetual'
    },
    {
      name: 'DOGEUSDT',
      price: '0.18236',
      ...randomChange(),
      type: 'Perpetual'
    },
    {
      name: 'XRPUSDT',
      price: '2.198',
      ...randomChange(),
      type: 'Perpetual'
    }
    ]

}