/**
 * contactsService.js
 * One API for device contacts on iOS, Android and the web.
 *
 *  - Native app (Capacitor on iOS / Google Play): full access via
 *    @capacitor-community/contacts. You can list, search, pick, create,
 *    update and remove contacts.
 *  - Mobile web (Chrome on Android): pick only, read-only, through the
 *    W3C Contact Picker API (navigator.contacts.select).
 *  - Any other browser: import from a .vcf / .csv file.
 *
 * Browsers do not let a web page read or write the address book. That is
 * why the full feature needs the native (Capacitor) build of the app.
 */

let ContactsPlugin = null;
let PhoneType = null;
let EmailType = null;

function isNativePlatform() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

async function loadNative() {
  if (ContactsPlugin) return ContactsPlugin;
  const mod = await import('@capacitor-community/contacts');
  ContactsPlugin = mod.Contacts;
  PhoneType = mod.PhoneType;
  EmailType = mod.EmailType;
  return ContactsPlugin;
}

const PROJECTION = {
  name: true,
  organization: true,
  phones: true,
  emails: true,
  postalAddresses: true,
  urls: true,
  birthday: true,
  note: true,
  image: false, // set to true if you need photos (slower, more memory)
};

/** 'native' | 'picker' | 'file' */
export function getMode() {
  if (isNativePlatform()) return 'native';
  if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
    return 'picker';
  }
  return 'file';
}

export function capabilities() {
  const mode = getMode();
  return {
    mode,
    list: mode === 'native',
    search: mode === 'native',
    pick: mode === 'native' || mode === 'picker',
    create: mode === 'native',
    update: mode === 'native',
    remove: mode === 'native',
    importFile: true,
  };
}

// ---------- normalisation: every mode returns the same shape ----------
/**
 * @typedef {Object} AppContact
 * @property {string|null} id
 * @property {string} displayName
 * @property {string} givenName
 * @property {string} familyName
 * @property {string} company
 * @property {{label:string, number:string}[]} phones
 * @property {{label:string, address:string}[]} emails
 * @property {string} note
 */

function fromNative(c) {
  const name = c.name || {};
  const displayName =
    name.display || [name.given, name.middle, name.family].filter(Boolean).join(' ') || '';
  return {
    id: c.contactId ?? null,
    displayName,
    givenName: name.given || '',
    familyName: name.family || '',
    company: c.organization?.company || '',
    phones: (c.phones || []).map((p) => ({ label: p.label || p.type || 'mobile', number: p.number || '' })),
    emails: (c.emails || []).map((e) => ({ label: e.label || e.type || 'home', address: e.address || '' })),
    note: c.note || '',
  };
}

function toNative(c) {
  const out = {
    name: { given: c.givenName || '', family: c.familyName || '' },
    phones: (c.phones || [])
      .filter((p) => p.number)
      .map((p) => ({ type: PhoneType.Mobile, label: p.label || 'mobile', number: p.number })),
    emails: (c.emails || [])
      .filter((e) => e.address)
      .map((e) => ({ type: EmailType.Home, label: e.label || 'home', address: e.address })),
  };
  if (c.company) out.organization = { company: c.company };
  if (c.note) out.note = c.note;
  return out;
}

function fromPicker(c) {
  const displayName = (c.name && c.name[0]) || '';
  const [givenName, ...rest] = displayName.split(' ');
  return {
    id: null,
    displayName,
    givenName: givenName || '',
    familyName: rest.join(' '),
    company: '',
    phones: (c.tel || []).map((n) => ({ label: 'mobile', number: n })),
    emails: (c.email || []).map((a) => ({ label: 'home', address: a })),
    note: '',
  };
}

// ---------- permissions ----------
export async function ensurePermission() {
  if (getMode() !== 'native') return true;
  const Contacts = await loadNative();
  let status = await Contacts.checkPermissions();
  if (status.contacts !== 'granted') status = await Contacts.requestPermissions();
  if (status.contacts !== 'granted') {
    throw new Error('Contacts permission was denied. Turn it on in Settings > Apps > Glymdot > Contacts.');
  }
  return true;
}

function requireNative(action) {
  if (getMode() !== 'native') {
    throw new Error(`"${action}" needs the Glymdot iOS or Android app. Web browsers do not allow it.`);
  }
}

// ---------- access / search ----------
export async function listContacts() {
  requireNative('List contacts');
  await ensurePermission();
  const Contacts = await loadNative();
  const { contacts } = await Contacts.getContacts({ projection: PROJECTION });
  return contacts.map(fromNative).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function getContact(id) {
  requireNative('Read contact');
  await ensurePermission();
  const Contacts = await loadNative();
  const { contact } = await Contacts.getContact({ contactId: id, projection: PROJECTION });
  return contact ? fromNative(contact) : null;
}

/** Search by name, company, email or phone (phones match on digits only). */
export async function searchContacts(query, source) {
  const all = source || (await listContacts());
  const q = (query || '').trim().toLowerCase();
  if (!q) return all;
  const digits = q.replace(/\D/g, '');
  return all.filter((c) => {
    const text = [c.displayName, c.company, ...c.emails.map((e) => e.address)].join(' ').toLowerCase();
    if (text.includes(q)) return true;
    return digits.length >= 3 && c.phones.some((p) => p.number.replace(/\D/g, '').includes(digits));
  });
}

// ---------- pick ----------
/** Opens the system contact picker. Returns an array of AppContact (empty if cancelled). */
export async function pickContacts({ multiple = true } = {}) {
  const mode = getMode();
  if (mode === 'native') {
    await ensurePermission();
    const Contacts = await loadNative();
    try {
      const { contact } = await Contacts.pickContact({ projection: PROJECTION });
      return contact ? [fromNative(contact)] : [];
    } catch (e) {
      if (/cancel/i.test(String(e?.message))) return [];
      throw e;
    }
  }
  if (mode === 'picker') {
    const supported = await navigator.contacts.getProperties();
    const props = ['name', 'email', 'tel'].filter((p) => supported.includes(p));
    try {
      const picked = await navigator.contacts.select(props, { multiple });
      return picked.map(fromPicker);
    } catch (e) {
      if (e?.name === 'AbortError' || e?.name === 'InvalidStateError') return [];
      throw e;
    }
  }
  throw new Error('This browser has no contact picker. Use "Import from file" instead.');
}

// ---------- create / update / remove ----------
export async function createContact(contact) {
  requireNative('Create contact');
  if (!contact.givenName && !contact.familyName && !(contact.phones || []).length) {
    throw new Error('A contact needs a name or a phone number.');
  }
  await ensurePermission();
  const Contacts = await loadNative();
  const { contactId } = await Contacts.createContact({ contact: toNative(contact) });
  return { ...contact, id: contactId };
}

/**
 * Update a device contact.
 * The Capacitor plugin has no in-place update, so this writes the new
 * contact first and only then deletes the old one. Nothing is lost if the
 * write fails. NOTE: the contact gets a NEW id; use the returned id.
 */
export async function updateContact(id, changes) {
  requireNative('Update contact');
  const current = await getContact(id);
  if (!current) throw new Error('That contact no longer exists on this device.');
  const merged = { ...current, ...changes };
  const created = await createContact(merged);
  const Contacts = await loadNative();
  await Contacts.deleteContact({ contactId: id });
  return created;
}

export async function removeContact(id) {
  requireNative('Remove contact');
  await ensurePermission();
  const Contacts = await loadNative();
  await Contacts.deleteContact({ contactId: id });
  return true;
}

// ---------- file import (works everywhere) ----------
function unfoldVcf(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

export function parseVcf(text) {
  const cards = unfoldVcf(text).split(/BEGIN:VCARD/i).slice(1);
  return cards.map((card) => {
    const c = { id: null, displayName: '', givenName: '', familyName: '', company: '', phones: [], emails: [], note: '' };
    for (const line of card.split('\n')) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const key = line.slice(0, idx).toUpperCase();
      const val = line.slice(idx + 1).trim();
      const base = key.split(';')[0].replace(/^ITEM\d+\./, '');
      const typeMatch = key.match(/TYPE=([^;:]+)/);
      const label = typeMatch ? typeMatch[1].split(',')[0].toLowerCase() : '';
      if (base === 'FN') c.displayName = val;
      else if (base === 'N') {
        const [family, given] = val.split(';');
        c.familyName = family || '';
        c.givenName = given || '';
      } else if (base === 'ORG') c.company = val.split(';')[0];
      else if (base === 'TEL') c.phones.push({ label: label || 'mobile', number: val });
      else if (base === 'EMAIL') c.emails.push({ label: label || 'home', address: val });
      else if (base === 'NOTE') c.note = val.replace(/\\n/g, '\n');
    }
    if (!c.displayName) c.displayName = [c.givenName, c.familyName].filter(Boolean).join(' ');
    return c;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Reads Google Contacts / Outlook style CSV exports. */
export function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const find = (...names) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const iGiven = find('first name', 'given name');
  const iFamily = find('last name', 'family name');
  const iName = find('name', 'display name', 'full name');
  const iOrg = find('organization name', 'organization 1 - name', 'company');
  const iNote = find('notes', 'note');
  const phoneCols = head.map((h, i) => (/phone.*value|phone$|mobile|tel/.test(h) ? i : -1)).filter((i) => i >= 0);
  const emailCols = head.map((h, i) => (/e-?mail.*(value|address)|^e-?mail$/.test(h) ? i : -1)).filter((i) => i >= 0);

  return lines.slice(1).map((line) => {
    const row = splitCsvLine(line);
    const givenName = iGiven >= 0 ? row[iGiven] || '' : '';
    const familyName = iFamily >= 0 ? row[iFamily] || '' : '';
    return {
      id: null,
      displayName: (iName >= 0 && row[iName]) || [givenName, familyName].filter(Boolean).join(' '),
      givenName,
      familyName,
      company: iOrg >= 0 ? row[iOrg] || '' : '',
      phones: phoneCols.flatMap((i) => (row[i] || '').split(':::')).map((s) => s.trim()).filter(Boolean)
        .map((number) => ({ label: 'mobile', number })),
      emails: emailCols.flatMap((i) => (row[i] || '').split(':::')).map((s) => s.trim()).filter(Boolean)
        .map((address) => ({ label: 'home', address })),
      note: iNote >= 0 ? row[iNote] || '' : '',
    };
  }).filter((c) => c.displayName || c.phones.length || c.emails.length);
}

export async function importFromFile(file) {
  const text = await file.text();
  if (/\.vcf$/i.test(file.name) || /BEGIN:VCARD/i.test(text)) return parseVcf(text);
  if (/\.csv$/i.test(file.name)) return parseCsv(text);
  throw new Error('Choose a .vcf (vCard) or .csv contacts file.');
}
