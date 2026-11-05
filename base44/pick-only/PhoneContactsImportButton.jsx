// PhoneContactsImportButton.jsx — put in components/ in Base44.
// One button. Tapping it opens the phone's contact screen; whoever the person
// picks is handed to onImport so you can save them into Glymdot.
//
//   <PhoneContactsImportButton onImport={async (contacts) => { ...save... }} />
//
// onImport gets an array of
// { firstName, lastName, displayName, company, phone, phones, email, emails, note }
// It may return how many were actually added (e.g. after skipping duplicates).

import React, { useState } from "react";
import { contactsMode, pickPhoneContacts } from "../lib/deviceContacts";

export default function PhoneContactsImportButton({ onImport, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [addedAny, setAddedAny] = useState(false);

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

  return (
    <div className={className}>
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 font-medium disabled:opacity-50"
      >
        {busy ? "Opening contacts…" : addedAny ? "Add another from phone contacts" : "Import from phone contacts"}
      </button>
      {message && <p className="mt-2 text-sm text-green-700 dark:text-green-400">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
