export type RawOrder = {
  orderHash: string;
  createDateTime: string;
  remainingMakerAmount: string;
  data: {
    maker: string;
    makerAsset: string;
    takerAsset: string;
    makingAmount: string;
    takingAmount: string;
  };
};
export type DisplayOrder = {
  orderHash: string;
  at: string;
  symbol: string;
  side: "BUY" | "SELL";
  amount: string;
  total: string;
  price: string;
  status: "OPEN";
};
export function classifyOrders(rows: RawOrder[], maker: string): RawOrder[];
export function formatUnits(raw: string, decimals: number): string;
export function orderRows(rows: RawOrder[], tokens: { address: string; symbol: string; decimals?: number }[], selectedAddress?: string): DisplayOrder[];
