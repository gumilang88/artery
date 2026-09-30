"use client";

import { useState } from "react";

import { ImageIcon, PlusIcon } from "@/components/icons";

type CreateCoinModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateCoinModal({ open, onClose }: CreateCoinModalProps) {
  const [mayhemMode, setMayhemMode] = useState(false);
  const [cashBack, setCashBack] = useState(false);
  const [pairWithUsdc, setPairWithUsdc] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="modal-backdrop animate-fade-in absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column */}
          <div>
            <div>
              <h2 className="text-2xl font-extrabold">Create new coin</h2>
              <p className="mt-1 text-xs text-text-tertiary">
                Choose carefully, these can&apos;t be changed once the coin is
                created
              </p>
            </div>

            {/* Form fields */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Coin name
                </label>
                <input className="input-pump" placeholder="Name your coin" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Ticker
                </label>
                <input className="input-pump" placeholder="Ticker symbol" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  className="input-pump resize-none"
                  placeholder="Describe your coin"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Add social links (Optional)
                </label>
                <input
                  className="input-pump"
                  placeholder="https://x.com/..."
                />
              </div>
            </div>

            {/* Option toggles */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setMayhemMode(!mayhemMode)}
                className="flex w-full items-start gap-3 border-b border-border py-3 text-left"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border">
                  {mayhemMode ? (
                    <PlusIcon className="h-4 w-4 text-white" />
                  ) : (
                    <PlusIcon className="h-4 w-4 text-transparent" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium">Mayhem mode</span>
                  <span className="mt-0.5 block text-xs text-text-tertiary">
                    Increased price volume. Active for 24h, only set at
                    creation. May increase coin supply.
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCashBack(!cashBack)}
                className="flex w-full items-start gap-3 border-b border-border py-3 text-left"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border">
                  {cashBack ? (
                    <PlusIcon className="h-4 w-4 text-white" />
                  ) : (
                    <PlusIcon className="h-4 w-4 text-transparent" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium">Cash back</span>
                  <span className="mt-0.5 block text-xs text-text-tertiary">
                    Creator rewards go to traders.
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPairWithUsdc(!pairWithUsdc)}
                className="flex w-full items-start gap-3 border-b border-border py-3 text-left"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border">
                  {pairWithUsdc ? (
                    <PlusIcon className="h-4 w-4 text-white" />
                  ) : (
                    <PlusIcon className="h-4 w-4 text-transparent" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium">Pair with USDC</span>
                  <span className="mt-0.5 block text-xs text-text-tertiary">
                    Create your coin with USDC liquidity
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Upload area */}
            <div
              onClick={() => alert("Upload")}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-border p-6 text-center transition hover:border-[#86EFAC]"
            >
              <ImageIcon className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
              <p className="text-sm font-medium">
                Select video or image to upload
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                or drag and drop it here
              </p>
            </div>

            {/* Info box */}
            <div className="mt-4 space-y-3 rounded-xl bg-muted p-4 text-xs text-text-tertiary">
              <div>
                <span className="block font-semibold text-white">
                  File size and type
                </span>
                <p className="mt-0.5">
                  Image - max 15mb. &quot;.jpg&quot;, &quot;.gif&quot; or
                  &quot;.png&quot; recommended
                </p>
                <p className="mt-0.5">
                  Video - max 30mb. &quot;.mp4&quot; recommended
                </p>
              </div>
              <div>
                <span className="block font-semibold text-white">
                  Resolution and aspect ratio
                </span>
                <p className="mt-0.5">
                  Image - min. 1000x1000px, 1:1 square recommended
                </p>
                <p className="mt-0.5">
                  Video - 16:9 or 9:16, 1080p+ recommended
                </p>
              </div>
            </div>

            {/* Banner */}
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium">
                Add banner (Optional)
              </label>
              <input className="input-pump" placeholder="Upload a banner" />
            </div>

            {/* Note */}
            <p className="mt-4 text-xs text-text-tertiary">
              Coin data (social links, banner, etc) can only be added now, and
              can&apos;t be changed or edited after creation
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button className="btn-ghost px-5 py-2.5 text-sm">Preview</button>
          <button
            onClick={onClose}
            className="btn-primary px-5 py-2.5 text-sm font-semibold"
          >
            Login to create coin
          </button>
        </div>
      </div>
    </div>
  );
}