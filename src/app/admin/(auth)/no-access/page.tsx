import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { AuthCard } from "@/modules/auth/components/AuthCard";
import { signOut } from "@/modules/auth/actions";

export const metadata: Metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <AuthCard
      title="No access"
      description="This account isn't set up for the Leaf Star admin. If you think it should be, ask the owner."
    >
      <form action={signOut}>
        <Button type="submit" size="lg" fullWidth>
          Sign out
        </Button>
      </form>
    </AuthCard>
  );
}
