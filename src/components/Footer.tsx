import Link from "next/link";

const columns = [
  {
    heading: "Exchange",
    links: [
      { label: "Markets", href: "/markets/spot" },
      { label: "Trade", href: "/trade" },
      { label: "Portfolio", href: "/tools" },
    ],
  },
  {
    heading: "Explore",
    links: [
      { label: "User Docs", href: "/docs/user-docs" },
      { label: "Developer Docs", href: "/docs/developer-docs" },
      { label: "SDK Docs", href: "/docs/sdk" },
      { label: "API Docs", href: "/docs/api" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "ARC Explorer", href: "https://explorer.arc.io" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="poly-footer">
      <div className="poly-footer-grid">
        <div className="poly-footer-brand">
          <span className="mark">A</span>
          <p>The ARC market terminal. Contract-keyed tokens, live market data, one trading desk.</p>
        </div>
        {columns.map(col => (
          <div key={col.heading}>
            <h3>{col.heading}</h3>
            <ul>
              {col.links.map(link => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="poly-footer-bottom">
        <small>© 2026 Artery · ARC Mainnet · Market data via Artery terminal feed.</small>
        <div className="poly-footer-social">
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X">𝕏</a>
          <a href="https://t.me" target="_blank" rel="noopener noreferrer" aria-label="Telegram">✈</a>
        </div>
      </div>
      <div className="poly-footer-wordmark" aria-hidden="true">artery</div>
    </footer>
  );
}
