// ReferralComponents.jsx — put in components/ in Base44.
//
// <ShareReferralButton url={user's referral link} />
//    The "invite a friend" button. Works on the website and in the app.
//
// <ReferralWebsiteNotice userId={user.id} claimUrl="https://glymdot.com/..." />
//    Put on the in-app upgrade screen. Shows the "claim on glymdot.com" note
//    only for US App Store users; shows nothing anywhere else.
//
// useReferralMode(userId)  -> "web" | "app-us" | "app-other" | null (still checking)
//    Wrap any referral pricing text with canShowReferralOffers(mode).

import React, { useEffect, useState } from "react";
import { getReferralMode, shareReferralLink, openInBrowser } from "../lib/referrals";

export function useReferralMode(userId) {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    let alive = true;
    getReferralMode(userId).then((m) => alive && setMode(m));
    return () => { alive = false; };
  }, [userId]);
  return mode;
}

export function ShareReferralButton({ url, text, className = "", label = "Invite friends" }) {
  const [status, setStatus] = useState("");
  const share = async () => {
    setStatus("");
    const result = await shareReferralLink({ url, text });
    if (result === "copied") setStatus("Link copied. Paste it anywhere to share.");
  };
  return (
    <div className={className}>
      <button
        type="button"
        onClick={share}
        disabled={!url}
        className="w-full rounded-lg bg-blue-600 text-white px-4 py-2.5 font-medium disabled:opacity-50"
      >
        {label}
      </button>
      {status && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{status}</p>}
    </div>
  );
}

export function ReferralWebsiteNotice({ userId, claimUrl, className = "" }) {
  const mode = useReferralMode(userId);
  if (mode !== "app-us") return null;
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <p className="text-sm">
        Were you invited by a friend? Referral offers are available on glymdot.com.
        Sign in there with this same account and your Premium works here too.
      </p>
      <button
        type="button"
        onClick={() => openInBrowser(claimUrl)}
        className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium"
      >
        Claim referral offer on glymdot.com
      </button>
    </div>
  );
}
