// syncAppStorePurchase — a Base44 BACKEND function.
// The app calls it after a purchase or restore, and each time the app opens.
// It asks RevenueCat (not the phone) whether the logged-in user has paid,
// so nobody can fake a purchase, then saves the result on their user record.
//
// Needs a Base44 secret named REVENUECAT_SECRET_KEY (RevenueCat > Project
// settings > API keys > a SECRET key, starts with sk_). Never put it in the frontend.

import { createClientFromRequest } from "npm:@base44/sdk";

const ENTITLEMENT_ID = "premium"; // must match lib/inAppPurchases.js

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Not logged in" }, { status: 401 });

    const secret = Deno.env.get("REVENUECAT_SECRET_KEY");
    if (!secret) return Response.json({ error: "REVENUECAT_SECRET_KEY is not set" }, { status: 500 });

    const rc = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
      { headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" } },
    );
    if (!rc.ok) {
      return Response.json({ error: `RevenueCat returned ${rc.status}` }, { status: 502 });
    }
    const { subscriber } = await rc.json();
    const ent = subscriber?.entitlements?.[ENTITLEMENT_ID];

    // expires_date is null for one-time (lifetime) purchases.
    const lifetime = !!ent && ent.expires_date === null;
    const expiresAt = ent?.expires_date ? new Date(ent.expires_date) : null;
    const active = lifetime || (!!expiresAt && expiresAt.getTime() > Date.now());

    // Save the expiry date, not a yes/no flag, so a lapsed subscription
    // stops counting even if the person only uses the website afterwards.
    const update = {
      app_store_premium_until: lifetime ? "lifetime" : expiresAt ? expiresAt.toISOString() : null,
      app_store_product: ent?.product_identifier || null,
    };
    await base44.asServiceRole.entities.User.update(user.id, update);

    return Response.json({ premium: active, ...update });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});
