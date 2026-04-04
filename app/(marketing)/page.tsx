import MarketingGate from "@/components/marketing/MarketingGate";
import MarketingHome from "@/components/marketing/MarketingHome";

export default function MarketingRootPage() {
  return (
    <MarketingGate>
      <MarketingHome />
    </MarketingGate>
  );
}
