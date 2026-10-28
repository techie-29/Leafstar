import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Inbox" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/inbox"
      step={9}
      what="Every buyer who tried to reach you (call taps, callback requests, price requests, chats) waiting for a reply, with email and phone alerts."
    />
  );
}
