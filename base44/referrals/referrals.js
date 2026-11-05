// referrals.js — put in lib/ in Base44.
// Decides what referral content may be shown where, and shares invite links.
//
//   "web"       website: show all referral offers as today (Stripe).
//   "app-us"    iPhone/Android app on the US store: referral pricing can't be
//               bought in the app, but Apple allows pointing US users to the
//               website, so show a "claim it on glymdot.com" note + link.
//   "app-other" app on any other country's store: Apple forbids mentioning
//               outside offers, so hide referral pricing completely.
// In every mode people can still SEND their referral link.

import { isAppStoreBuild, setupPurchases } from "./inAppPurchases";

const plugins = () => window?.Capacitor?.Plugins || {};

let cachedMode = null;

/** Resolves to "web" | "app-us" | "app-other". Pass the logged-in user's id. */
export async function getReferralMode(userId) {
  if (!isAppStoreBuild()) return "web";
  if (cachedMode) return cachedMode;
  try {
    await setupPurchases(userId);
    const { countryCode } = await plugins().Purchases.getStorefront();
    // iPhone reports "USA", Android reports "US".
    cachedMode = ["USA", "US"].includes(String(countryCode).toUpperCase()) ? "app-us" : "app-other";
  } catch {
    // Can't tell the country: take the safe option and say nothing about offers.
    cachedMode = "app-other";
  }
  return cachedMode;
}

/** May referral pricing / extended trials be described here? */
export const canShowReferralOffers = (mode) => mode === "web" || mode === "app-us";

/**
 * Opens the phone's share sheet (Messages, WhatsApp, email…) with the invite.
 * Falls back to copying the link. Returns "shared" | "copied" | "cancelled".
 */
export async function shareReferralLink({ url, text = "Join me on glym", title = "glym" }) {
  const Share = plugins().Share;
  try {
    if (isAppStoreBuild() && Share) {
      await Share.share({ title, text, url, dialogTitle: "Invite to glym" });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (e) {
    if (/cancel|abort/i.test(String(e?.message || e?.name || e))) return "cancelled";
    // anything else: fall through to copying
  }
  await copyText(url);
  return "copied";
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const box = document.createElement("textarea");
    box.value = value;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    document.execCommand("copy");
    box.remove();
  }
}

/** Opens a glymdot.com page in Safari/Chrome (outside the app). */
export async function openInBrowser(url) {
  const Launcher = plugins().AppLauncher;
  if (isAppStoreBuild() && Launcher) {
    await Launcher.openUrl({ url });
  } else {
    window.open(url, "_blank", "noopener");
  }
}
