import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutLegalNotice } from "@/components/CheckoutLegalNotice";

export function StripeEmbeddedCheckout({
  priceId,
  customerEmail,
  userId,
  returnUrl,
}: {
  priceId: string;
  customerEmail?: string;
  userId?: string;
  returnUrl: string;
}) {
  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, customerEmail, userId, returnUrl, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Checkout konnte nicht gestartet werden.");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout" className="space-y-4">
      <CheckoutLegalNotice />
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
