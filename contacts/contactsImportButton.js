/**
 * contactsImportButton.js
 * Hooks the contacts features onto your existing Import button.
 *
 *   import { attachContactsImport } from './contacts/contactsImportButton.js';
 *   attachContactsImport(document.querySelector('#import-btn'), {
 *     onImport: (contacts) => { ...save them into Glymdot... },
 *   });
 *
 * What the user sees after tapping Import:
 *   iOS / Android app : Pick a contact | Browse & manage device contacts | Import from file
 *   Android Chrome    : Pick from phone contacts | Import from file
 *   Other browsers    : Import from file (+ a note that the app does more)
 */
import * as Contacts from './contactsService.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

let stylesAdded = false;
function addStyles() {
  if (stylesAdded) return;
  stylesAdded = true;
  const css = `
  .gc-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;z-index:99999}
  .gc-sheet{background:var(--gc-bg,#fff);color:var(--gc-fg,#111);width:100%;max-width:520px;max-height:88vh;overflow:auto;
    border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));font:15px/1.4 system-ui,-apple-system,sans-serif;box-sizing:border-box}
  @media (prefers-color-scheme:dark){.gc-sheet{--gc-bg:#1c1c1e;--gc-fg:#f2f2f7;--gc-muted:#9a9aa0;--gc-line:#333}}
  .gc-sheet h3{margin:0 0 12px;font-size:17px}
  .gc-btn{display:block;width:100%;text-align:left;padding:12px 14px;margin:6px 0;border:1px solid var(--gc-line,#ddd);border-radius:10px;
    background:transparent;color:inherit;font:inherit;cursor:pointer}
  .gc-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb;text-align:center}
  .gc-btn.danger{color:#dc2626;text-align:center}
  .gc-row{display:flex;gap:8px;align-items:center;padding:10px 4px;border-bottom:1px solid var(--gc-line,#eee)}
  .gc-row .gc-main{flex:1;min-width:0}
  .gc-row .gc-sub{color:var(--gc-muted,#666);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gc-small{padding:6px 10px;border:1px solid var(--gc-line,#ddd);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}
  .gc-input{width:100%;box-sizing:border-box;padding:10px 12px;margin:4px 0 10px;border:1px solid var(--gc-line,#ccc);border-radius:10px;font:inherit;background:transparent;color:inherit}
  .gc-note{color:var(--gc-muted,#666);font-size:13px;margin:8px 0}
  .gc-err{color:#dc2626;font-size:13px;margin:8px 0}`;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
}

function openSheet(html) {
  addStyles();
  const backdrop = document.createElement('div');
  backdrop.className = 'gc-backdrop';
  backdrop.innerHTML = `<div class="gc-sheet" role="dialog" aria-modal="true">${html}</div>`;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.body.appendChild(backdrop);
  const sheet = backdrop.firstElementChild;
  function close() { backdrop.remove(); }
  function render(newHtml) { sheet.innerHTML = newHtml; }
  return { sheet, close, render };
}

function showError(sheet, err) {
  let box = sheet.querySelector('.gc-err');
  if (!box) { box = document.createElement('div'); box.className = 'gc-err'; sheet.appendChild(box); }
  box.textContent = err?.message || String(err);
}

function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vcf,.csv,text/vcard,text/x-vcard,text/csv';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

export function attachContactsImport(button, { onImport, onError } = {}) {
  if (!button) throw new Error('attachContactsImport: button not found');
  const fail = (e) => (onError ? onError(e) : console.error(e));

  button.addEventListener('click', (e) => {
    e.preventDefault();
    openMenu();
  });

  function openMenu() {
    const caps = Contacts.capabilities();
    const ui = openSheet(`
      <h3>Import contacts</h3>
      ${caps.pick ? `<button class="gc-btn" data-act="pick">📇 Pick from phone contacts</button>` : ''}
      ${caps.list ? `<button class="gc-btn" data-act="manage">🔍 Browse, search &amp; manage device contacts</button>` : ''}
      <button class="gc-btn" data-act="file">📄 Import from file (.vcf / .csv)</button>
      ${caps.mode === 'file' ? `<p class="gc-note">Get the Glymdot app on iOS or Google Play to pick, search and edit the contacts on your phone.</p>` : ''}
      ${caps.mode === 'picker' ? `<p class="gc-note">Editing phone contacts needs the Glymdot app.</p>` : ''}
      <button class="gc-btn" data-act="cancel" style="text-align:center">Cancel</button>`);

    ui.sheet.addEventListener('click', async (ev) => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      try {
        if (act === 'cancel') return ui.close();
        if (act === 'pick') {
          const picked = await Contacts.pickContacts({ multiple: true });
          if (picked.length) { ui.close(); onImport?.(picked); }
        }
        if (act === 'file') {
          const file = await pickFile();
          if (!file) return;
          const list = await Contacts.importFromFile(file);
          if (!list.length) throw new Error('No contacts found in that file.');
          ui.close();
          onImport?.(list);
        }
        if (act === 'manage') { ui.close(); openManager(); }
      } catch (err) { showError(ui.sheet, err); fail(err); }
    });
  }

  // ---------- native-only manager: list, search, select, create, edit, delete ----------
  async function openManager() {
    const ui = openSheet(`<h3>Device contacts</h3><p class="gc-note">Loading…</p>`);
    let all = [];
    const selected = new Set();
    try { all = await Contacts.listContacts(); }
    catch (err) { showError(ui.sheet, err); return fail(err); }

    function rows(list) {
      if (!list.length) return `<p class="gc-note">No contacts match.</p>`;
      return list.map((c) => `
        <div class="gc-row">
          <input type="checkbox" data-sel="${esc(c.id)}" ${selected.has(c.id) ? 'checked' : ''} aria-label="Select ${esc(c.displayName)}">
          <div class="gc-main">
            <div>${esc(c.displayName || '(no name)')}</div>
            <div class="gc-sub">${esc([c.phones[0]?.number, c.emails[0]?.address].filter(Boolean).join(' · '))}</div>
          </div>
          <button class="gc-small" data-edit="${esc(c.id)}">Edit</button>
        </div>`).join('');
    }

    function draw(query = '') {
      ui.render(`
        <h3>Device contacts (${all.length})</h3>
        <input class="gc-input" type="search" placeholder="Search name, phone, email, company" value="${esc(query)}" data-search>
        <button class="gc-btn" data-act="new">＋ New contact</button>
        <div data-list>${rows(all)}</div>
        <button class="gc-btn primary" data-act="import">Import selected (${selected.size})</button>
        <button class="gc-btn" data-act="close" style="text-align:center">Close</button>`);
      const search = ui.sheet.querySelector('[data-search]');
      const listBox = ui.sheet.querySelector('[data-list]');
      search.addEventListener('input', async () => {
        listBox.innerHTML = rows(await Contacts.searchContacts(search.value, all));
      });
      if (query) search.dispatchEvent(new Event('input'));
    }

    ui.sheet.addEventListener('change', (ev) => {
      const id = ev.target.dataset?.sel;
      if (id === undefined) return;
      ev.target.checked ? selected.add(id) : selected.delete(id);
      const btn = ui.sheet.querySelector('[data-act="import"]');
      if (btn) btn.textContent = `Import selected (${selected.size})`;
    });

    ui.sheet.addEventListener('click', async (ev) => {
      const t = ev.target.closest('[data-act],[data-edit]');
      if (!t) return;
      try {
        if (t.dataset.act === 'close') return ui.close();
        if (t.dataset.act === 'import') {
          const chosen = all.filter((c) => selected.has(c.id));
          if (!chosen.length) throw new Error('Select at least one contact.');
          ui.close();
          return onImport?.(chosen);
        }
        if (t.dataset.act === 'new') return openEditor(null);
        if (t.dataset.edit) return openEditor(all.find((c) => c.id === t.dataset.edit));
      } catch (err) { showError(ui.sheet, err); fail(err); }
    });

    function openEditor(contact) {
      const c = contact || { givenName: '', familyName: '', company: '', phones: [], emails: [], note: '' };
      const ed = openSheet(`
        <h3>${contact ? 'Edit contact' : 'New contact'}</h3>
        <label>First name<input class="gc-input" name="givenName" value="${esc(c.givenName)}"></label>
        <label>Last name<input class="gc-input" name="familyName" value="${esc(c.familyName)}"></label>
        <label>Company<input class="gc-input" name="company" value="${esc(c.company)}"></label>
        <label>Phone<input class="gc-input" name="phone" type="tel" value="${esc(c.phones[0]?.number)}"></label>
        <label>Email<input class="gc-input" name="email" type="email" value="${esc(c.emails[0]?.address)}"></label>
        <label>Note<input class="gc-input" name="note" value="${esc(c.note)}"></label>
        <button class="gc-btn primary" data-act="save">Save to phone</button>
        ${contact ? `<button class="gc-btn danger" data-act="delete">Delete from phone</button>` : ''}
        <button class="gc-btn" data-act="cancel" style="text-align:center">Cancel</button>`);

      ed.sheet.addEventListener('click', async (ev) => {
        const act = ev.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        const val = (n) => ed.sheet.querySelector(`[name="${n}"]`).value.trim();
        try {
          if (act === 'cancel') return ed.close();
          if (act === 'save') {
            const phone = val('phone');
            const email = val('email');
            const data = {
              givenName: val('givenName'),
              familyName: val('familyName'),
              company: val('company'),
              note: val('note'),
              // keep any extra numbers/emails, replace only the first one
              phones: phone ? [{ label: c.phones[0]?.label || 'mobile', number: phone }, ...c.phones.slice(1)] : c.phones.slice(1),
              emails: email ? [{ label: c.emails[0]?.label || 'home', address: email }, ...c.emails.slice(1)] : c.emails.slice(1),
            };
            if (contact) await Contacts.updateContact(contact.id, data);
            else await Contacts.createContact(data);
          }
          if (act === 'delete') {
            if (!confirm(`Delete ${c.displayName || 'this contact'} from your phone? This cannot be undone.`)) return;
            await Contacts.removeContact(contact.id);
            if (contact.id) selected.delete(contact.id);
          }
          ed.close();
          all = await Contacts.listContacts();
          draw(ui.sheet.querySelector('[data-search]')?.value || '');
        } catch (err) { showError(ed.sheet, err); fail(err); }
      });
    }

    draw();
  }
}
