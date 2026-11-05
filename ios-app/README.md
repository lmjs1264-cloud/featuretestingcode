# Glymdot iPhone & Android app

A small app that opens **https://glymdot.com** full-screen and lets the
"Import from phone contacts" button open the phone's contact picker.
Your site stays in Base44: change it there and the app shows the change
straight away. You only rebuild this app to change its name, icon or permissions.

Already set up:
- App name **Glymdot**, bundle ID **com.glymdot.app** (change both in `capacitor.config.json` before your first upload; the bundle ID can't change after that).
- Contacts plugin (`@capacitor-community/contacts`).
- iPhone permission message (`NSContactsUsageDescription` in `ios/App/App/Info.plist`).
- Android read-contacts permission.
- A "can't reach Glymdot" page for when the phone is offline.

## Build for iPhone (needs a Mac)

1. Install **Xcode** from the Mac App Store and **Node.js** (LTS) from nodejs.org.
2. Download this repo (green **Code** button → Download ZIP) and open the `ios-app` folder in Terminal.
3. Install and sync:

   ```bash
   npm install && npx cap sync ios
   ```

4. Open the project in Xcode:

   ```bash
   npx cap open ios
   ```

5. In Xcode: click **App** in the left sidebar → **Signing & Capabilities** → pick your Team (your Apple Developer account).
6. Plug in your iPhone, pick it at the top of Xcode, and press ▶ Run. Go to Add Someone and tap **Import from phone contacts**.
7. When it works: **Product → Archive → Distribute App → App Store Connect** to upload, then test it with TestFlight before submitting for review.

Add an app icon in Xcode under `App/Assets.xcassets/AppIcon` before submitting.

## No Mac?

Use a cloud build service such as Codemagic or Ionic Appflow. Point it at this repo's `ios-app` folder.
It signs and uploads with your Apple Developer account.
