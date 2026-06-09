import { Navigate, useOutletContext } from "react-router-dom";
import MessengerApp from "@/components/messenger/MessengerApp";
import type { TenantCtx } from "./TenantLayout";

export default function TenantChat() {
  const ctx = useOutletContext<TenantCtx>();
  if (!ctx.tenant) return <Navigate to="/mein-immoniq/verbinden" replace />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">Mit deinem Vermieter und in Hausgruppen — alles an einem Ort.</p>
      </div>
      <MessengerApp mode="tenant" />
    </div>
  );
}
