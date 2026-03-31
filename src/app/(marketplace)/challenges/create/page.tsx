import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreateChallengeForm } from "@/components/challenges/CreateChallengeForm";
import { Swords } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default async function CreateChallengePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Swords size={20} className="text-neon-purple" />
          Host a Match
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Post a wager challenge for another player to accept.
        </p>
      </div>

      <Card>
        <CardContent>
          <CreateChallengeForm />
        </CardContent>
      </Card>
    </div>
  );
}
