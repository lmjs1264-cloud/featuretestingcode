// DeviceContactsDialog.jsx — put in src/components/ in Base44.
// A pop-up for picking, searching, adding, editing and deleting phone contacts.
// Uses plain React + Tailwind (already in Base44 apps), no extra packages.
//
// Usage next to your Import button:
//   const [open, setOpen] = useState(false);
//   {contactsMode() !== "none" && (
//     <Button onClick={() => setOpen(true)}>Import from phone contacts</Button>
//   )}
//   <DeviceContactsDialog open={open} onClose={() => setOpen(false)}
//     onImport={async (contacts) => { /* save to your Base44 entity */ }} />

import React, { useEffect, useMemo, useState } from "react";
import {
  contactsMode, listDeviceContacts, searchContacts, pickDeviceContacts,
  createDeviceContact, updateDeviceContact, removeDeviceContact,
} from "../lib/deviceContacts";

const EMPTY = { firstName: "", lastName: "", company: "", phone: "", email: "", note: "" };

export default function DeviceContactsDialog({ open, onClose, onImport }) {
  const mode = contactsMode();
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // null | "new" | contact
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = async () => {
    if (mode !== "native") return;
    setBusy(true);
    setError("");
    try { setContacts(await listDeviceContacts()); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (open) { setSelected(new Set()); setQuery(""); setEditing(null); reload(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shown = useMemo(() => searchContacts(contacts, query), [contacts, query]);

  if (!open) return null;

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  };

  const finishImport = async (list) => {
    if (!list.length) return;
    await onImport?.(list);
    onClose?.();
  };

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const startEdit = (c) => {
    setEditing(c || "new");
    setForm(c ? {
      firstName: c.firstName, lastName: c.lastName, company: c.company,
      phone: c.phone, email: c.email, note: c.note,
    } : EMPTY);
  };

  const save = () => run(async () => {
    if (editing === "new") await createDeviceContact(form);
    else await updateDeviceContact(editing.id, form);
    setEditing(null);
    await reload();
  });

  const remove = () => run(async () => {
    if (!window.confirm(`Delete ${editing.displayName || "this contact"} from your phone? This can't be undone.`)) return;
    await removeDeviceContact(editing.id);
    setSelected((prev) => { const n = new Set(prev); n.delete(editing.id); return n; });
    setEditing(null);
    await reload();
  });

  const field = (key, label, type = "text") => (
    <label className="block text-sm mb-3">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
         onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4"
           style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>

        {editing ? (
          <>
            <h2 className="text-lg font-semibold mb-4">{editing === "new" ? "New contact" : "Edit contact"}</h2>
            {field("firstName", "First name")}
            {field("lastName", "Last name")}
            {field("company", "Company")}
            {field("phone", "Phone", "tel")}
            {field("email", "Email", "email")}
            {field("note", "Note")}
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button disabled={busy} onClick={save}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 mb-2 disabled:opacity-50">
              {busy ? "Saving…" : "Save to phone"}
            </button>
            {editing !== "new" && (
              <button disabled={busy} onClick={remove}
                className="w-full rounded-lg border border-red-300 text-red-600 py-2.5 mb-2">
                Delete from phone
              </button>
            )}
            <button onClick={() => setEditing(null)} className="w-full rounded-lg border py-2.5">Back</button>
          </>
        ) : mode === "native" ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Phone contacts ({contacts.length})</h2>
              <button onClick={onClose} className="text-sm text-gray-500">Close</button>
            </div>
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, email, company"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 mb-3"
            />
            <div className="flex gap-2 mb-3">
              <button onClick={() => startEdit(null)} className="flex-1 rounded-lg border py-2 text-sm">+ New contact</button>
              <button disabled={busy}
                onClick={() => run(async () => finishImport(await pickDeviceContacts()))}
                className="flex-1 rounded-lg border py-2 text-sm">Open phone picker</button>
            </div>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            {busy && !contacts.length ? <p className="text-sm text-gray-500">Loading…</p> : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-3">
                {shown.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                      aria-label={`Select ${c.displayName}`} className="h-5 w-5" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{c.displayName || "(no name)"}</div>
                      <div className="truncate text-sm text-gray-500">
                        {[c.phone, c.email].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <button onClick={() => startEdit(c)} className="text-sm rounded-md border px-2 py-1">Edit</button>
                  </li>
                ))}
                {!shown.length && !busy && <li className="py-3 text-sm text-gray-500">No contacts match.</li>}
              </ul>
            )}
            <button disabled={!selected.size || busy}
              onClick={() => run(() => finishImport(contacts.filter((c) => selected.has(c.id))))}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 disabled:opacity-50">
              Import selected ({selected.size})
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-3">Import from phone contacts</h2>
            <p className="text-sm text-gray-500 mb-3">
              {mode === "picker"
                ? "Choose contacts from your phone. To search, add or edit phone contacts, use the Glymdot app."
                : "This browser can't open your phone contacts. Use the Glymdot iPhone or Android app."}
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            {mode === "picker" && (
              <button disabled={busy}
                onClick={() => run(async () => finishImport(await pickDeviceContacts()))}
                className="w-full rounded-lg bg-blue-600 text-white py-2.5 mb-2">Choose contacts</button>
            )}
            <button onClick={onClose} className="w-full rounded-lg border py-2.5">Close</button>
          </>
        )}
      </div>
    </div>
  );
}
