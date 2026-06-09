import MessengerApp from "@/components/messenger/MessengerApp";
import { MessageSquare } from "lucide-react";

export default function Chat() {
  return (
    <div className="container max-w-7xl py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> Chat
        </h1>
        <p className="text-sm text-muted-foreground">Direkt mit Mietern und in Hausgruppen — verschlüsselt in deiner ImmonIQ-Inbox.</p>
      </div>
      <MessengerApp mode="landlord" />
    </div>
  );
}
