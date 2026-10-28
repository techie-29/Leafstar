import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Chats" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/chats"
      step={8}
      what="Conversations with the website assistant, questions it couldn't answer, and a way to flag answers that need fixing."
    />
  );
}
