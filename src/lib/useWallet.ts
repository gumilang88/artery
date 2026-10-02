"use client";
import { useCallback, useEffect, useState } from "react";

export type WalletState = {
  address: string | null;
  chainId: string | null;
  connecting: boolean;
  error: string | null;
};

const ARC_CHAIN_ID = "0x13b2"; // 5042
const ARC_CHAIN = {
  chainId: ARC_CHAIN_ID,
  chainName: "ARC Mainnet",
  nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
  rpcUrls: ["https://rpc.mainnet.arc.io"],
  blockExplorerUrls: ["https://explorer.arc.io"],
};

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

function getProvider() {
  return typeof window !== "undefined" ? window.ethereum : undefined;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({ address: null, chainId: null, connecting: false, error: null });

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setState(s => ({ ...s, error: "No wallet detected. Install MetaMask or Rabby." }));
      return null;
    }
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      setState({ address: accounts[0] ?? null, chainId, connecting: false, error: null });
      return accounts[0] ?? null;
    } catch (e) {
      setState(s => ({ ...s, connecting: false, error: e instanceof Error ? e.message : "Connection rejected" }));
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, chainId: null, connecting: false, error: null });
  }, []);

  const switchToArc = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return false;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_ID }] });
      return true;
    } catch (e) {
      const code = (e as { code?: number })?.code;
      if (code === 4902) {
        try {
          await provider.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN] });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, []);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? [];
      setState(s => ({ ...s, address: accounts[0] ?? null }));
    };
    const onChain = (...args: unknown[]) => {
      const chainId = (args[0] as string) ?? null;
      setState(s => ({ ...s, chainId }));
    };

    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);

    // Rehydrate on mount
    provider
      .request({ method: "eth_accounts" })
      .then(accounts => {
        const list = accounts as string[];
        if (list[0]) {
          provider.request({ method: "eth_chainId" }).then(chainId => {
            setState(s => ({ ...s, address: list[0], chainId: chainId as string }));
          });
        }
      })
      .catch(() => {});

    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  return { ...state, connect, disconnect, switchToArc };
}
