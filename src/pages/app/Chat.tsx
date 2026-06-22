import { useState } from "react";
import MessengerApp from "@/components/messenger/MessengerApp";
import Messenger from "@/pages/app/Messenger";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox as InboxIcon, Home, Megaphone } from "lucide-react";

export default function Chat() {
  const [tab, setTab] = useState<"tenants" | "listings">("tenants");
  return (
    <div className="container max-w-7xl py-6 space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <InboxIcon className="h-7 w-7 text-primary" /> Postfach
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alle Chats an einem Ort — Mieter, Hausgruppen und Inserate.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "tenants" | "listings")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants" className="gap-1.5">
            <Home className="h-3.5 w-3.5" /> Mieter & Hausgruppen
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" /> Inserate & Bewerber
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-0">
          <MessengerApp mode="landlord" />
        </TabsContent>

        <TabsContent value="listings" className="mt-0">
          {/* Embedded inline so user gets ONE Postfach */}
          <Messenger />
        </TabsContent>
      </Tabs>
    </div>
  );
}
