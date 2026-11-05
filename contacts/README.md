# Glymdot device contacts (Import button)

Lets people using the Glymdot **iOS** or **Google Play** app **access, search,
pick, create, update and remove** the contacts on their phone from the Import button.

## Why the app is needed

Browsers do not let a website read or change the phone's address book. The most a
browser gives you is the Contact Picker API, which only Chrome on Android supports
and which is **pick-only and read-only**. To get the full feature, Glymdot is wrapped
as a native app with [Capacitor](https://capacitorjs.com), and the
`@capacitor-community/contacts` plugin talks to the iOS and Android contact stores.

The same code runs everywhere and only shows what the device can actually do:

| Where it runs                  | Pick | List / search | Create / update / delete | File import |
|--------------------------------|:----:|:-------------:|:------------------------:|:-----------:|
| iOS app / Android app          |  ✅  |      ✅       |            ✅            |     ✅      |
| Chrome on Android (website)    |  ✅  |       –       |             –            |     ✅      |
| Safari, desktop browsers       |   –  |       –       |             –            |     ✅      |

## Files

- `contactsService.js`: the contacts API (`listContacts`, `searchContacts`, `pickContacts`,
  `createContact`, `updateContact`, `removeContact`, `importFromFile`, `capabilities`).
- `contactsImportButton.js`: the menu and contact manager screens that open from your Import button.
- `demo.html`: a small test page.

## 1. Hook it to your Import button

```js
import { attachContactsImport } from './contacts/contactsImportButton.js';

attachContactsImport(document.querySelector('#import-btn'), {
  onImport: (contacts) => {
    // contacts = [{ id, displayName, givenName, familyName, company,
    //               phones:[{label, number}], emails:[{label, address}], note }]
    // Save them into Glymdot here.
  },
  onError: (err) => console.warn(err),
});
```

Change `#import-btn` to the selector of your real button.

## 2. Build the iOS and Android apps (one-time setup)

Run these in your web app's project folder:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor-community/contacts
```

```bash
npx cap init Glymdot com.glymdot.app --web-dir=dist
```

(Use your build output folder for `--web-dir`: `dist`, `build`, `www` and so on.)

```bash
npx cap add ios
```

```bash
npx cap add android
```

After each web build:

```bash
npm run build && npx cap sync
```

If your site has no bundler, copy `contactsService.js` into a bundled build, or replace the
`import('@capacitor-community/contacts')` line with `window.Capacitor.Plugins.Contacts` and the
`PhoneType` / `EmailType` values with the strings `'mobile'` and `'home'`.

### iOS permission text (required, or Apple rejects the app)

In `ios/App/App/Info.plist`, add:

```xml
<key>NSContactsUsageDescription</key>
<string>Glymdot uses your contacts so you can import, add and edit people.</string>
```

### Android permissions

In `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`, add:

```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
```

Google Play asks you to explain contacts access in the Data safety form. Say that contacts
are used to import people into Glymdot, and say whether they leave the device.

## Things to know

- **Update gives a new id.** The plugin cannot edit a contact in place, so `updateContact`
  saves the new version first and then deletes the old one. Use the id it returns.
- **Delete is permanent** on the phone. The UI asks the user to confirm first.
- **Pick on iOS/Android returns one contact per tap.** To import many at once, use
  "Browse, search & manage", which has checkboxes.
- Photos are off by default. Set `image: true` in `PROJECTION` in `contactsService.js` to include them.
- If the user denies permission, they get a message pointing them to the phone's Settings.
