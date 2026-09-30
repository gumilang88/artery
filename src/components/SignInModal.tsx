"use client";

import {
  AppleIcon,
  CloseIcon,
  CoinbaseIcon,
  GitHubIcon,
  GoogleIcon,
  PhantomIcon,
  WalletIcon,
} from "@/components/icons";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SignInModal({ open, onClose }: SignInModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-backdrop animate-fade-in absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-text-secondary">
              Sign wallet
            </p>
            <h2 className="mt-1 text-3xl font-extrabold">Welcome back</h2>
            <p className="mt-1 text-sm text-text-tertiary">
              Sign in to start trading.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-muted"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Social sign in */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-text-tertiary">
            Continue with a social account
          </p>
          <div className="space-y-2">
            <button className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 transition hover:bg-muted">
              <GoogleIcon className="h-5 w-5" />
              Continue with Google
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 transition hover:bg-muted">
              <AppleIcon className="h-5 w-5" />
              Continue with Apple
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 transition hover:bg-muted">
              <GitHubIcon className="h-5 w-5" />
              Continue with GitHub
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <hr className="flex-1 border-border" />
          <span className="text-center text-xs text-text-tertiary">
            or connect a wallet
          </span>
          <hr className="flex-1 border-border" />
        </div>

        {/* Wallets */}
        <div className="space-y-2">
          <button className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 transition hover:bg-muted">
            <PhantomIcon className="h-5 w-5" />
            Phantom
          </button>
          <button className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-2.5 transition hover:bg-muted">
            <CoinbaseIcon className="h-5 w-5" />
            Coinbase Wallet
          </button>
        </div>
        <button className="btn-ghost mt-2 flex w-full items-center justify-center gap-2 py-2.5">
          <WalletIcon className="h-5 w-5" />
          More wallets
        </button>
      </div>
    </div>
  );
}