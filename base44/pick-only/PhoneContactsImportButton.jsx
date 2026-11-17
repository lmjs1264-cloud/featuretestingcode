// PhoneContactsImportButton.jsx — put in components/ in Base44.
// One button. Tapping it opens the phone's contact screen; whoever the person
// picks is handed to onImport so you can save them into Glymdot.
//
// The first time (in the iPhone/Android app only), a short explainer appears
// before the phone's own permission pop-up. Apple's rules: it has ONE button
// ("Continue") that always leads to the system pop-up — no "Not now"/"Allow".
//
//   <PhoneContactsImportButton onImport={async (contacts) => { ...save... }} />
//
// onImport gets an array of
// { firstName, lastName, displayName, company, phone, phones, email, emails, note }
// It may return how many were actually added (e.g. after skipping duplicates).

import React, { useState } from "react";
import { contactsMode, contactsPermissionState, pickPhoneContacts } from "../lib/deviceContacts";

export default function PhoneContactsImportButton({ onImport, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [addedAny, setAddedAny] = useState(false);
  const [explainer, setExplainer] = useState(false);

  if (contactsMode() === "none") return null; // desktop / Safari: hide it

  const pick = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const contacts = await pickPhoneContacts();
      if (!contacts.length) return; // closed without choosing
      const result = await onImport?.(contacts);
      const added = typeof result === "number" ? result : contacts.length;
      const names = contacts.map((c) => c.displayName || c.phone || c.email).join(", ");
      setMessage(added ? `Added ${names}.` : `${names} is already in your contacts.`);
      setAddedAny(true);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if ((await contactsPermissionState()) === "prompt") {
      setExplainer(true); // first time: explain, then the phone asks
      return;
    }
    pick();
  };

  const continueFromExplainer = () => {
    setExplainer(false);
    pick();
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 font-medium disabled:opacity-50"
      >
        {busy ? "Opening contacts…" : addedAny ? "Add another from phone contacts" : "Import from phone contacts"}
      </button>
      {message && <p className="mt-2 text-sm text-green-700 dark:text-green-400">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {explainer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contacts-explainer-title"
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
          >
            <h2 id="contacts-explainer-title" className="text-lg font-semibold mb-3">
              Import from your contacts
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              For the best experience with glym, we recommend choosing <strong>Allow Full Access</strong> on
              the next screen. You'll still choose exactly who gets imported — glym only adds the people you
              pick.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              glym never changes or deletes the contacts on your phone, and you can change this anytime in
              Settings.
            </p>
            <button
              type="button"
              onClick={continueFromExplainer}
              className="w-full rounded-lg bg-blue-600 text-white py-3 font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
