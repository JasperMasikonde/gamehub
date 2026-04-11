import { WalletCard } from "@/components/wallet/WalletCard";

export const metadata = { title: "My Wallet | Eshabiki" };

export default function WalletPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-text-primary mb-6">My Wallet</h1>
      <WalletCard />
    </div>
  );
}
