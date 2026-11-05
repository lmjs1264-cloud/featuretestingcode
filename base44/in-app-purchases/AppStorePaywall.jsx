// AppStorePaywall.jsx — put in components/ in Base44.
// The upgrade screen shown INSIDE the iPhone/Android app instead of Stripe.
//
//   <AppStorePaywall
//     userId={user.id}
//     onPaid={async () => { await syncAppStorePurchase(); refresh the user; }}
//     termsUrl="https://glymdot.com/terms" privacyUrl="https://glymdot.com/privacy" />

import React, { useEffect, useState } from "react";
import { setupPurchases, getPlans, buyPlan, restorePurchases } from "../lib/inAppPurchases";

export default function AppStorePaywall({ userId, onPaid, termsUrl, privacyUrl }) {
  const [plans, setPlans] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await setupPurchases(userId);
        const list = await getPlans();
        if (alive) setPlans(list);
      } catch (e) {
        if (alive) { setPlans([]); setError(e?.message || "Couldn't load plans. Check your connection."); }
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const run = async (key, fn) => {
    setBusy(key); setError(""); setNote("");
    try { await fn(); } catch (e) { setError(e?.message || String(e)); }
    finally { setBusy(""); }
  };

  const buy = (plan) => run(plan.id, async () => {
    const { cancelled, paid } = await buyPlan(plan);
    if (cancelled) return;
    if (!paid) throw new Error("Payment is still processing. Try Restore Purchases in a minute.");
    await onPaid?.();
  });

  const restore = () => run("restore", async () => {
    const paid = await restorePurchases();
    if (paid) await onPaid?.();
    else setNote("No purchases found for this Apple ID or Google account.");
  });

  return (
    <div className="space-y-3">
      {plans === null && <p className="text-sm text-gray-500">Loading plans…</p>}
      {plans?.length === 0 && !error && (
        <p className="text-sm text-gray-500">No plans are available right now.</p>
      )}
      {plans?.map((plan) => (
        <button
          key={plan.id}
          type="button"
          disabled={!!busy}
          onClick={() => buy(plan)}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 p-4 text-left disabled:opacity-50"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{plan.title}</span>
            <span className="font-semibold whitespace-nowrap">{busy === plan.id ? "…" : plan.label}</span>
          </div>
          {plan.description && <div className="mt-1 text-sm text-gray-500">{plan.description}</div>}
        </button>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {note && <p className="text-sm text-gray-600 dark:text-gray-300">{note}</p>}

      <button type="button" onClick={restore} disabled={!!busy}
        className="w-full py-2 text-sm underline disabled:opacity-50">
        {busy === "restore" ? "Restoring…" : "Restore Purchases"}
      </button>

      {/* Apple requires this wording and these links on subscription screens. */}
      <p className="text-xs text-gray-500 leading-relaxed">
        Subscriptions renew automatically at the price shown until cancelled. Cancel at least
        24 hours before the end of the current period in your Apple ID or Google Play
        settings. Payment is charged to your Apple ID or Google Play account.{" "}
        {termsUrl && <a href={termsUrl} className="underline">Terms of Use</a>}
        {termsUrl && privacyUrl && " · "}
        {privacyUrl && <a href={privacyUrl} className="underline">Privacy Policy</a>}
      </p>
    </div>
  );
}
