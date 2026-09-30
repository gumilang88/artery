import type {Metadata} from "next";
import "./globals.css";
import "./home.css";
import "./markets.css";
import "./trade.css";
import "./trade-layout.css";
import "./connect.css";
import {Shell} from "@/components/Shell";
export const metadata:Metadata={title:"Artery — ARC Markets",description:"Discover and trade tokens across ARC."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Shell>{children}</Shell></body></html>}
