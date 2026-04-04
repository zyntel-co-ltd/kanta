import { Inter } from "next/font/google";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-marketing",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} min-h-screen flex flex-col bg-white text-slate-900`}>
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
