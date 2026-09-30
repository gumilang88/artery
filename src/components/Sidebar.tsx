"use client";

import {
  ArrowUpRightIcon,
  CloseIcon,
  CreateIcon,
  ExploreIcon,
  GoIcon,
  HomeIcon,
  LiveIcon,
  LogoIcon,
  MayhemIcon,
  PlusIcon,
  PumpCoinIcon,
  SupportIcon,
  TerminalIcon,
} from "@/components/icons";
import { sidebarItems } from "@/lib/data";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onOpenCreate: () => void;
  onOpenSignIn: () => void;
};

const iconMap = {
  home: HomeIcon,
  explore: ExploreIcon,
  go: GoIcon,
  mayhem: MayhemIcon,
  live: LiveIcon,
  support: SupportIcon,
  terminal: TerminalIcon,
  pump: PumpCoinIcon,
  create: CreateIcon,
} as const;

export function Sidebar({
  open,
  onClose,
  onOpenCreate,
  onOpenSignIn,
}: SidebarProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="modal-backdrop animate-fade-in absolute inset-0"
        onClick={onClose}
      />
      <aside className="animate-slide-down absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-[#14151C] p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoIcon width={30} height={30} />
            <span className="text-lg font-bold">pump.fun</span>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost border-0 p-2"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-6 flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <a
                key={item.href}
                href={item.href}
                className={`sidebar-link${item.icon === "pump" ? " sidebar-link-accent" : ""}`}
              >
                <Icon />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="my-4 border-t border-border" />

        {/* Create */}
        <button
          onClick={onOpenCreate}
          className="btn-primary flex w-full items-center justify-center gap-2 py-2.5"
        >
          <PlusIcon />
          <span>Create</span>
        </button>
        <button
          onClick={onOpenSignIn}
          className="btn-ghost mt-2 flex w-full items-center justify-center gap-2 py-2.5"
        >
          <ArrowUpRightIcon />
          <span>Try app</span>
        </button>
      </aside>
    </div>
  );
}