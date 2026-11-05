# Phone contacts for Glymdot (Base44)

Two files to add to the Base44 app:

| File | Where it goes in Base44 |
|---|---|
| `deviceContacts.js` | `src/lib/deviceContacts.js` (or `lib/deviceContacts.js`) |
| `DeviceContactsDialog.jsx` | `src/components/DeviceContactsDialog.jsx` (or `components/`) |

If your folders differ, fix the import line at the top of `DeviceContactsDialog.jsx`.

## Prompt for Base44's AI chat

> Add the two files I'm pasting below exactly as written: `lib/deviceContacts.js` and
> `components/DeviceContactsDialog.jsx`. Don't rewrite them. Then, next to the existing
> Import button on the contacts import page, add an "Import from phone contacts" button.
> Only show it when `contactsMode()` from `lib/deviceContacts.js` is not `"none"`.
> Clicking it opens `<DeviceContactsDialog open onClose onImport />`. In `onImport`,
> save each contact into the same entity the current Import button saves to, mapping
> firstName, lastName, company, phone, email and note to the matching fields. Skip
> contacts whose phone or email already exists. Don't add any npm packages.

## Notes

- On the website the button only appears in Chrome on Android, and there it can only pick contacts.
  Search, add, edit and delete appear only inside the Glymdot iPhone/Android app.
- The code uses `window.Capacitor.Plugins.Contacts`, which the iPhone app provides.
  No npm install is needed in Base44.
- Editing a phone contact gives it a new id (the plugin saves the new version, then deletes the old one).
