// inAppPurchases.js — put in lib/ in Base44.
// Apple / Google in-app purchases through RevenueCat. Only does anything
// inside the glym iPhone/Android app; on the website keep using Stripe.
// No npm packages: the app provides window.Capacitor.Plugins.Purchases.

// ---- fill these in from RevenueCat (Project settings > API keys) ----
// These are PUBLIC keys (they start with appl_ and goog_), safe to keep here.
export const REVENUECAT_IOS_KEY = "appl_REPLACE_ME";
export const REVENUECAT_ANDROID_KEY = "goog_REPLACE_ME";
// The entitlement you create in RevenueCat that means "this person has paid".
export const ENTITLEMENT_ID = "glym_premium";

const plugin = () => window?.Capacitor?.Plugins?.Purchases;
const platform = () => window?.Capacitor?.getPlatform?.() || "web";

/** True inside the iPhone/Android app, where Stripe must not be shown. */
export function isAppStoreBuild() {
  return !!(window?.Capacitor?.isNativePlatform?.() && plugin());
}

let configuredFor = null;

/** Call once you know who is logged in. userId = the Base44 user's id. */
export async function setupPurchases(userId) {
  if (!isAppStoreBuild()) return;
  if (!userId) throw new Error("Log in before buying.");
  if (configuredFor === userId) return;
  const { isConfigured } = await plugin().isConfigured();
  if (!isConfigured) {
    const apiKey = platform() === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    await plugin().configure({ apiKey, appUserID: String(userId) });
  } else {
    await plugin().logIn({ appUserID: String(userId) });
  }
  configuredFor = userId;
}

export function hasPaid(customerInfo) {
  return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
}

const PERIODS = { P1W: "week", P1M: "month", P3M: "3 months", P6M: "6 months", P1Y: "year" };

/** The plans set up in RevenueCat's current offering, with store prices. */
export async function getPlans() {
  const { current } = await plugin().getOfferings();
  if (!current) return [];
  return current.availablePackages.map((pkg) => {
    const p = pkg.product || {};
    const period = PERIODS[p.subscriptionPeriod] || "";
    return {
      id: pkg.identifier,
      title: p.title || pkg.identifier,
      description: p.description || "",
      price: p.priceString || "",
      period, // "" for one-time purchases
      label: period ? `${p.priceString} / ${period}` : p.priceString,
      raw: pkg,
    };
  });
}

const isCancel = (e) =>
  e?.userCancelled === true || e?.data?.userCancelled === true ||
  String(e?.code) === "1" || /cancel/i.test(String(e?.message || ""));

/** Opens Apple's / Google's payment sheet. Returns { cancelled, paid }. */
export async function buyPlan(plan) {
  try {
    const { customerInfo } = await plugin().purchasePackage({ aPackage: plan.raw });
    return { cancelled: false, paid: hasPaid(customerInfo) };
  } catch (e) {
    if (isCancel(e)) return { cancelled: true, paid: false };
    throw new Error(e?.message || "The purchase didn't go through. You haven't been charged.");
  }
}

/** Apple requires a Restore Purchases button. Returns true if they have paid. */
export async function restorePurchases() {
  const { customerInfo } = await plugin().restorePurchases();
  return hasPaid(customerInfo);
}

export async function checkPaid() {
  const { customerInfo } = await plugin().getCustomerInfo();
  return hasPaid(customerInfo);
}

/**
 * Use this anywhere the app decides "has this person paid?", together with
 * your existing Stripe check:  isPremium = stripeActive || isAppStorePremium(user)
 * Works on the website too (it only reads the user record).
 */
export function isAppStorePremium(user) {
  const until = user?.app_store_premium_until;
  if (!until) return false;
  if (until === "lifetime") return true;
  return new Date(until).getTime() > Date.now();
}
