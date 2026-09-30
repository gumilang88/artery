import { LiveVolumeHero } from "@/components/LiveVolumeHero";

export default function VolumeHeroPreviewPage() {
  return <main className="vh-market-preview">
    <section className="vh-market-shell">
      <div className="vh-market-copy">
        <span>ARC MAINNET · ARC MARKETS</span>
        <h1>Artery Markets</h1>
        <p>Discover tokens, track trades, and explore activity across ARC.</p>
      </div>
      <LiveVolumeHero preview />
    </section>
  </main>;
}
