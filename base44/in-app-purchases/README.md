# In-app purchases for glym (Apple & Google)

Inside the iPhone/Android app, people pay through Apple or Google, handled by
RevenueCat. On the website, Stripe stays as it is. Paying in either place
unlocks the same features.

```
Phone app: AppStorePaywall → Apple/Google payment sheet → RevenueCat
           → syncAppStorePurchase (Base44 backend) asks RevenueCat → saves app_store_premium_until on the user
Website:   Stripe, unchanged.  Paid check = Stripe OR isAppStorePremium(user)
```

## Setup checklist (in this order)

### 1. Apple (App Store Connect)
1. Agreements, Tax, and Banking: accept the **Paid Apps** agreement and add bank and tax details. Purchases don't work until this is done.
2. Create the app record with bundle ID `com.glymdot.app` (or whatever you set in `ios-app/capacitor.config.json`).
3. Monetization > Subscriptions: create a subscription group (e.g. "glym Premium") and the plans (e.g. `glym_premium_monthly`, `glym_premium_yearly`) with prices, display names and a review screenshot.
4. Apply for the **App Store Small Business Program** (15% instead of 30%).
5. Users and Access > Integrations > In-App Purchase: create a key and download the `.p8` file (RevenueCat needs it).

### 2. Google Play Console (when you do Android)
1. Set up a payments profile, then create the same subscriptions under Monetize > Subscriptions.
2. Give RevenueCat access with a service account (RevenueCat's guide walks through it).

### 3. RevenueCat (free until $2,500/month in revenue)
1. Create a project, and add an **App Store** app (upload the `.p8` key) and later a **Play Store** app.
2. Products: import the products you made in step 1.
3. Entitlements: create one called **`premium`** and attach all the products.
4. Offerings: make the **default** offering current and add packages (Monthly, Annual) using those products.
5. API keys: copy the **public** iOS key (`appl_…`) and Android key (`goog_…`) into `lib/inAppPurchases.js`. Create a **secret** key (`sk_…`).

### 4. Base44
1. Paste `PASTE_INTO_BASE44.txt` into the AI chat.
2. Add the secret **`REVENUECAT_SECRET_KEY`** with the `sk_…` key (Base44 dashboard secrets / environment variables). Never paste it into the chat or the frontend.
3. Put the public keys into `lib/inAppPurchases.js` (replace `appl_REPLACE_ME` / `goog_REPLACE_ME`).

### 5. Test
1. App Store Connect > Users and Access > Sandbox: create a sandbox tester.
2. Run the app on your iPhone from Xcode, open the upgrade screen, buy with the sandbox account (no real charge).
3. Check RevenueCat's dashboard shows the customer (its id is the Base44 user id), and that paid features unlock.
4. Delete and reinstall the app, log in, tap **Restore Purchases**: should unlock again.
5. Log into glymdot.com in a browser with the same account: paid features should be unlocked there too.

## Notes for App Review
- In the review notes, give Apple a test login and say purchases are on the upgrade screen.
- Don't mention the website price or Stripe anywhere inside the app (outside the US that breaks guideline 3.1.1).
- Restore Purchases, auto-renew wording and Terms/Privacy links are already on the paywall; Apple checks for them.
