import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleAdCheckoutCompleted(session: any, env: StripeEnv) {
  const meta = session.metadata || {};
  if (meta.type !== "ad_order") return;
  const adSlotId = meta.adSlotId;
  const weeks = Math.max(1, Number(meta.weeks) || 1);
  if (!adSlotId) return;

  const sb = getSupabase();
  // Order bezahlt markieren
  await sb.from("ad_orders").update({
    status: "paid",
    stripe_payment_intent: session.payment_intent,
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("stripe_session_id", session.id).eq("environment", env);

  // paid_until verlängern (von max(now, paid_until) + weeks*7d)
  const { data: slot } = await sb.from("ad_slots").select("paid_until").eq("id", adSlotId).single();
  const baseMs = slot?.paid_until && new Date(slot.paid_until as string) > new Date()
    ? new Date(slot.paid_until as string).getTime()
    : Date.now();
  const newUntil = new Date(baseMs + weeks * 7 * 86400000).toISOString();

  await sb.from("ad_slots").update({
    paid_until: newUntil,
    active: true,
    updated_at: new Date().toISOString(),
  }).eq("id", adSlotId);

  // Send invoice email for ad payment
  try {
    const userId = meta.userId;
    if (userId) {
      const { data: u } = await sb.auth.admin.getUserById(userId);
      const email = u?.user?.email;
      const prefs = await sb.from("notification_prefs").select("email_invoice").eq("user_id", userId).maybeSingle();
      const optIn = prefs.data?.email_invoice ?? true;
      if (email && optIn) {
        const amount = (session.amount_total ?? 0) / 100;
        const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: (session.currency ?? "eur").toUpperCase() });
        await sb.functions.invoke("send-transactional-email", {
          body: {
            templateName: "invoice",
            recipientEmail: email,
            idempotencyKey: `invoice-ad-${session.id}`,
            templateData: {
              description: `ImmoNIQ Werbeplatz · ${weeks} Woche${weeks === 1 ? "" : "n"}`,
              amountFormatted: formatter.format(amount),
              invoiceNumber: session.id?.slice(-12).toUpperCase(),
              invoiceDate: new Date().toLocaleDateString("de-DE"),
              hostedInvoiceUrl: session.url || undefined,
            },
          },
        });
      }
    }
  } catch (e) { console.warn("ad invoice mail failed", e); }
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  // Subscription invoice — Stripe generates a GoBD-compliant PDF.
  try {
    const sb = getSupabase();
    const customerId = invoice.customer;
    const { data: sub } = await sb.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).eq("environment", env).maybeSingle();
    const userId = sub?.user_id;
    if (!userId) return;
    const { data: u } = await sb.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (!email) return;
    const prefs = await sb.from("notification_prefs").select("email_invoice").eq("user_id", userId).maybeSingle();
    if (prefs.data?.email_invoice === false) return;

    const amount = (invoice.amount_paid ?? invoice.total ?? 0) / 100;
    const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: (invoice.currency ?? "eur").toUpperCase() });
    const lineDesc = invoice.lines?.data?.[0]?.description ?? "ImmoNIQ Pro";

    await sb.functions.invoke("send-transactional-email", {
      body: {
        templateName: "invoice",
        recipientEmail: email,
        idempotencyKey: `invoice-sub-${invoice.id}`,
        templateData: {
          description: lineDesc,
          amountFormatted: formatter.format(amount),
          invoiceNumber: invoice.number || invoice.id?.slice(-12).toUpperCase(),
          invoiceDate: invoice.created ? new Date(invoice.created * 1000).toLocaleDateString("de-DE") : new Date().toLocaleDateString("de-DE"),
          invoicePdfUrl: invoice.invoice_pdf || undefined,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
        },
      },
    });
  } catch (e) { console.warn("subscription invoice mail failed", e); }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  // Idempotenz: Stripe liefert at-least-once. Doppel-Events ignorieren.
  const sb = getSupabase();
  const { error: dupErr } = await sb
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, environment: env, event_type: event.type });
  if (dupErr) {
    // 23505 = unique_violation → schon verarbeitet
    if ((dupErr as any).code === "23505") {
      console.log("Duplicate webhook event ignored:", event.id);
      return;
    }
    // Anderer Fehler: weitermachen, aber loggen — lieber doppelt als verloren
    console.warn("webhook dedup insert failed:", dupErr);
  }

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleAdCheckoutCompleted(event.data.object, env);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await handleInvoicePaid(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
