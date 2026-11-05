// deviceContacts.js — put in src/lib/ (or src/utils/) in Base44.
// Talks to the phone's contacts. Needs no npm packages.
//
// Inside the Glymdot iPhone/Android app (Capacitor): list, search, pick,
//   create, update, remove.
// Chrome on Android (website): pick only (read-only).
// Everywhere else: reports "not available" so the UI can hide the option.

const plugin = () => window?.Capacitor?.Plugins?.Contacts;

const isNativeApp = () =>
  !!(window?.Capacitor?.isNativePlatform?.() && plugin());

const hasWebPicker = () =>
  typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

export function contactsMode() {
  if (isNativeApp()) return "native";
  if (hasWebPicker()) return "picker";
  return "none";
}

const PROJECTION = {
  name: true, organization: true, phones: true, emails: true, note: true,
};

// One shape for every source:
// { id, displayName, firstName, lastName, company, phone, phones[], email, emails[], note }
function fromNative(c) {
  const n = c.name || {};
  const phones = (c.phones || []).map((p) => p.number).filter(Boolean);
  const emails = (c.emails || []).map((e) => e.address).filter(Boolean);
  return {
    id: c.contactId ?? null,
    displayName: n.display || [n.given, n.family].filter(Boolean).join(" "),
    firstName: n.given || "",
    lastName: n.family || "",
    company: c.organization?.company || "",
    phone: phones[0] || "",
    phones,
    email: emails[0] || "",
    emails,
    note: c.note || "",
  };
}

function toNative(c) {
  const phones = c.phones?.length ? c.phones : c.phone ? [c.phone] : [];
  const emails = c.emails?.length ? c.emails : c.email ? [c.email] : [];
  const out = {
    name: { given: c.firstName || "", family: c.lastName || "" },
    phones: phones.filter(Boolean).map((number) => ({ type: "mobile", label: "mobile", number })),
    emails: emails.filter(Boolean).map((address) => ({ type: "home", label: "home", address })),
  };
  if (c.company) out.organization = { company: c.company };
  if (c.note) out.note = c.note;
  return out;
}

function fromWebPicker(c) {
  const displayName = c.name?.[0] || "";
  const [firstName = "", ...rest] = displayName.split(" ");
  const phones = c.tel || [];
  const emails = c.email || [];
  return {
    id: null, displayName, firstName, lastName: rest.join(" "), company: "",
    phone: phones[0] || "", phones, email: emails[0] || "", emails, note: "",
  };
}

function needApp(what) {
  if (!isNativeApp()) throw new Error(`${what} works in the Glymdot iPhone or Android app.`);
}

export async function ensureContactsPermission() {
  if (!isNativeApp()) return;
  let s = await plugin().checkPermissions();
  if (s.contacts !== "granted") s = await plugin().requestPermissions();
  if (s.contacts !== "granted") {
    throw new Error("Contacts access is off. Turn it on in Settings > Glymdot > Contacts.");
  }
}

export async function listDeviceContacts() {
  needApp("Browsing contacts");
  await ensureContactsPermission();
  const { contacts } = await plugin().getContacts({ projection: PROJECTION });
  return contacts.map(fromNative).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function searchContacts(list, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return list;
  const digits = q.replace(/\D/g, "");
  return list.filter((c) => {
    const text = [c.displayName, c.company, ...c.emails].join(" ").toLowerCase();
    if (text.includes(q)) return true;
    return digits.length >= 3 && c.phones.some((p) => p.replace(/\D/g, "").includes(digits));
  });
}

export async function pickDeviceContacts() {
  const mode = contactsMode();
  if (mode === "native") {
    await ensureContactsPermission();
    try {
      const { contact } = await plugin().pickContact({ projection: PROJECTION });
      return contact ? [fromNative(contact)] : [];
    } catch (e) {
      if (/cancel/i.test(String(e?.message))) return [];
      throw e;
    }
  }
  if (mode === "picker") {
    try {
      const picked = await navigator.contacts.select(["name", "email", "tel"], { multiple: true });
      return picked.map(fromWebPicker);
    } catch (e) {
      if (e?.name === "AbortError" || e?.name === "InvalidStateError") return [];
      throw e;
    }
  }
  throw new Error("Picking phone contacts works in the Glymdot app.");
}

export async function createDeviceContact(contact) {
  needApp("Adding contacts");
  if (!contact.firstName && !contact.lastName && !contact.phone) {
    throw new Error("Add a name or a phone number.");
  }
  await ensureContactsPermission();
  const { contactId } = await plugin().createContact({ contact: toNative(contact) });
  return { ...contact, id: contactId };
}

// The plugin has no in-place edit: save the new version first, then delete
// the old one, so nothing is lost if saving fails. The contact gets a new id.
export async function updateDeviceContact(id, changes) {
  needApp("Editing contacts");
  await ensureContactsPermission();
  const { contact } = await plugin().getContact({ contactId: id, projection: PROJECTION });
  if (!contact) throw new Error("That contact is no longer on this phone.");
  const merged = { ...fromNative(contact), ...changes };
  if ("phone" in changes) merged.phones = [changes.phone, ...merged.phones.slice(1)].filter(Boolean);
  if ("email" in changes) merged.emails = [changes.email, ...merged.emails.slice(1)].filter(Boolean);
  const created = await createDeviceContact(merged);
  await plugin().deleteContact({ contactId: id });
  return created;
}

export async function removeDeviceContact(id) {
  needApp("Deleting contacts");
  await ensureContactsPermission();
  await plugin().deleteContact({ contactId: id });
}
