import { redirect } from "next/navigation";
import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { CreateRankPushForm } from "@/components/rank-push/CreateRankPushForm";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Rank Push Listing | Eshabiki",
};

export default async function CreateRankPushPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?next=/rank-push/create");
  }

  // Check isRankPusher from DB
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isRankPusher: true },
  });

  if (!dbUser?.isRankPusher) {
    redirect("/rank-push");
  }

  const categories = await prisma.rankPushCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp size={20} className="text-neon-purple" />
          Create Rank Push Listing
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Offer your rank pushing service to clients on the marketplace.
        </p>
      </div>

      <Card>
        <CardContent>
          <CreateRankPushForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
