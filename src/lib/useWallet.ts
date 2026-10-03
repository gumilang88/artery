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

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setState(s => ({ ...s, error: "No wallet detected. Install MetaMask or Rabby." }));
      return null;
    }
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      let chainId = (await provider.request({ method: "eth_chainId" })) as string;
      if (chainId.toLowerCase() !== ARC_CHAIN_ID) {
        const switched = await switchToArc();
        if (!switched) {
          setState({ address: accounts[0] ?? null, chainId, connecting: false, error: "Switch your wallet to ARC Mainnet (chain 5042)." });
          return accounts[0] ?? null;
        }
        chainId = (await provider.request({ method: "eth_chainId" })) as string;
      }
      setState({ address: accounts[0] ?? null, chainId, connecting: false, error: null });
      return accounts[0] ?? null;
    } catch (e) {
      setState(s => ({ ...s, connecting: false, error: e instanceof Error ? e.message : "Connection rejected" }));
      return null;
    }
  }, [switchToArc]);


  const disconnect = useCallback(() => {
    setState({ address: null, chainId: null, connecting: false, error: null });
  }, []);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? [];
      setState(s => ({ ...s, address: accounts[0] ?? null }));
    };
    const onChain = async (...args: unknown[]) => {
      const chainId = (args[0] as string) ?? null;
      if (chainId && chainId.toLowerCase() !== ARC_CHAIN_ID) {
        const switched = await switchToArc();
        if (switched) {
          const current = (await provider.request({ method: "eth_chainId" })) as string;
          setState(s => ({ ...s, chainId: current, error: null }));
          return;
        }
        setState(s => ({ ...s, chainId, error: "Wrong network. Switch your wallet to ARC Mainnet (chain 5042)." }));
        return;
      }
      setState(s => ({ ...s, chainId, error: null }));
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
            const currentChain = chainId as string;
            if (currentChain.toLowerCase() !== ARC_CHAIN_ID) {
              switchToArc().then(async switched => {
                if (!switched) {
                  setState(s => ({ ...s, address: list[0], chainId: currentChain, error: "Wrong network. Switch your wallet to ARC Mainnet (chain 5042)." }));
                  return;
                }
                const arcChain = (await provider.request({ method: "eth_chainId" })) as string;
                setState(s => ({ ...s, address: list[0], chainId: arcChain, error: null }));
              });
            } else {
              setState(s => ({ ...s, address: list[0], chainId: currentChain, error: null }));
            }
          });
        }
      })
      .catch(() => {});

    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [switchToArc]);

  return { ...state, connect, disconnect, switchToArc };
}
