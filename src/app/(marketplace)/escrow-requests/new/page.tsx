import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewEscrowRequestForm } from "@/components/escrow/NewEscrowRequestForm";

export default async function NewEscrowRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Request Escrow Service</h1>
        <p className="text-text-muted text-sm mt-2 leading-relaxed">
          Already agreed on a deal outside GameHub? Use our escrow to protect both sides.
          Enter the other party&apos;s username and the deal details — they&apos;ll get a
          notification to accept.
        </p>
      </div>
      <NewEscrowRequestForm />
    </div>
  );
}
