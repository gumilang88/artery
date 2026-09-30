"use client";

import {
  ChevronDownIcon,
  HomeIcon,
  LiveIcon,
  LogoIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  SparkleIcon,
} from "@/components/icons";

type NavbarProps = {
  onOpenSidebar: () => void;
  onOpenCreate: () => void;
  onOpenSignIn: () => void;
  onOpenCreateMenu: (open: boolean) => void;
  createMenuOpen: boolean;
};

const createMenuItems = [
  { label: "New coin", icon: PlusIcon, onClick: undefined },
  { label: "Go live", icon: LiveIcon, onClick: undefined },
  { label: "Callout", icon: SparkleIcon, onClick: undefined },
  { label: "Post bounty", icon: HomeIcon, onClick: undefined },
];

export function Navbar({
  onOpenSidebar,
  onOpenCreate,
  onOpenSignIn,
  onOpenCreateMenu,
  createMenuOpen,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[#14151C]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSidebar}
            className="btn-ghost border-0 p-2"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <button className="flex items-center gap-2">
            <LogoIcon width={30} height={30} />
            <span className="hidden text-lg font-bold sm:block">pump.fun</span>
          </button>
        </div>

        {/* Center: search pill */}
        <button className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm text-text-tertiary">
          <SearchIcon className="shrink-0" />
          <span className="truncate">Search for coins and users...</span>
          <kbd className="ml-auto hidden items-center rounded-md border border-border px-1.5 py-0.5 text-[11px] leading-none md:flex">
            ⌘K
          </kbd>
        </button>

        {/* Right: create menu + sign in */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => onOpenCreateMenu(!createMenuOpen)}
              className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
            >
              <PlusIcon />
              <span>Create</span>
              <ChevronDownIcon
                className={`transition-transform ${createMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {createMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                {createMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={
                        item.label === "New coin" ? onOpenCreate : undefined
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={onOpenSignIn}
            className="btn-primary px-4 py-2 text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
}