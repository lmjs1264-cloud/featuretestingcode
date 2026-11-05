// deviceContacts.js — put in lib/ in Base44.
// Opens the phone's own contact picker and returns what the person chose.
// Read-only: it never changes the contacts on the phone. No npm packages.
//
// Inside the Glymdot iPhone/Android app: opens the phone's contact screen.
// Chrome on Android (website): opens Chrome's contact picker (can pick several).
// Other browsers: contactsMode() returns "none", so hide the button.

const plugin = () => window?.Capacitor?.Plugins?.Contacts;
const platform = () => window?.Capacitor?.getPlatform?.() || "web";

export function contactsMode() {
  if (window?.Capacitor?.isNativePlatform?.() && plugin()) return "native";
  if (typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window) {
    return "picker";
  }
  return "none";
}

const PROJECTION = { name: true, organization: true, phones: true, emails: true, note: true };

// Every contact comes back in this shape:
// { firstName, lastName, displayName, company, phone, phones[], email, emails[], note }
function fromNative(c) {
  const n = c.name || {};
  const phones = (c.phones || []).map((p) => p.number).filter(Boolean);
  const emails = (c.emails || []).map((e) => e.address).filter(Boolean);
  return {
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

function fromWebPicker(c) {
  const displayName = c.name?.[0] || "";
  const [firstName = "", ...rest] = displayName.split(" ");
  const phones = c.tel || [];
  const emails = c.email || [];
  return {
    displayName, firstName, lastName: rest.join(" "), company: "",
    phone: phones[0] || "", phones, email: emails[0] || "", emails, note: "",
  };
}

async function askPermission() {
  let s = await plugin().checkPermissions();
  if (s.contacts !== "granted") s = await plugin().requestPermissions();
  if (s.contacts !== "granted") {
    throw new Error("Contacts access is off. Turn it on in your phone's Settings > Glymdot > Contacts.");
  }
}

const isCancel = (e) => /cancel/i.test(String(e?.message || e));

/**
 * Opens the phone's contact screen. Returns the chosen contacts,
 * or [] if the person closes it without choosing.
 * In the app, the phone's screen returns one contact per opening.
 */
export async function pickPhoneContacts() {
  const mode = contactsMode();

  if (mode === "native") {
    // Android needs permission first. iPhone's picker usually doesn't, so
    // only ask on iPhone if the picker refuses without it.
    if (platform() === "android") await askPermission();
    try {
      const { contact } = await plugin().pickContact({ projection: PROJECTION });
      return contact ? [fromNative(contact)] : [];
    } catch (e) {
      if (isCancel(e)) return [];
      if (platform() !== "ios") throw e;
      await askPermission();
      try {
        const { contact } = await plugin().pickContact({ projection: PROJECTION });
        return contact ? [fromNative(contact)] : [];
      } catch (e2) {
        if (isCancel(e2)) return [];
        throw e2;
      }
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

  throw new Error("Importing phone contacts works in the Glymdot iPhone or Android app.");
}
