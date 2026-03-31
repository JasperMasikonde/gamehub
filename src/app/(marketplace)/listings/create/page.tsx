import { ListingForm } from "@/components/listings/ListingForm";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Plus } from "lucide-react";

export default function CreateListingPage() {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
          <Plus size={16} className="text-neon-green" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Create Listing</h1>
          <p className="text-sm text-text-muted">
            Your listing will be reviewed before going live
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary">Account Details</h2>
        </CardHeader>
        <CardContent>
          <ListingForm />
        </CardContent>
      </Card>
    </div>
  );
}
