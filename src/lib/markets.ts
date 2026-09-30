import data from "../../public/data/markets.json";
export type Market={symbol:string;name:string;address:string;price:number;mcap:number;volume24:number;change24h:number;icon:string;holderCount:number;liquidityUsdc:number|null;spark:number[];topVersion:"v4";quoteSymbols:string[]};
export const markets=data as Market[];
export const quoteAssets=[
 {symbol:"USDC",name:"USD Coin",color:"#2775ca"},
 {symbol:"ARC",name:"Arc",color:"#f4f5f7"},
 {symbol:"WETH",name:"Wrapped Ether",color:"#627eea"},
 {symbol:"cirBTC",name:"Circle Bitcoin",color:"#f7931a"},
];
export function money(n:number){if(n>=1e6)return `$${(n/1e6).toFixed(2)}M`;if(n>=1e3)return `$${(n/1e3).toFixed(1)}K`;return `$${n.toFixed(2)}`}
export function price(n:number){if(n>=1)return n.toLocaleString(undefined,{maximumFractionDigits:4});if(n>=.01)return n.toFixed(5);return n.toFixed(12).replace(/0+$/,"").replace(/\.$/,"")}
