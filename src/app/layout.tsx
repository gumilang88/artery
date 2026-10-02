import type {Metadata} from "next";
import "./globals.css";
import "./home.css";
import "./markets.css";
import "./trade.css";
import "./trade-layout.css";
import "./connect.css";
import "./volume-hero.css";
import "./volume-hero-compact.css";
import "./volume-hero-preview.css";
import "./volume-chart.css";
import {Shell} from "@/components/Shell";
export const metadata:Metadata={title:"Artery — ARC Markets",description:"Discover and trade tokens across ARC.",icons:{icon:[{url:"/artery-logo-32.png",sizes:"32x32",type:"image/png"},{url:"/artery-logo-192.png",sizes:"192x192",type:"image/png"}],shortcut:"/artery-logo-32.png",apple:"/artery-logo-192.png"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Shell>{children}</Shell></body></html>}
