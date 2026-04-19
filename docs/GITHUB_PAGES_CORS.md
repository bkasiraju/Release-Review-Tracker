# Allow GitHub Pages to call GUS (Salesforce REST)

The dashboard on **GitHub Pages** runs in the browser and calls **Salesforce REST** (`gus.my.salesforce.com`) using the token from **API Settings**. The browser will block those calls until the **GUS org allowlists your site’s origin** (CORS).

## What to add

Use the **origin** only (scheme + host, **no path**, no trailing slash after the host unless your admin UI requires it):

| Environment | Allowed origin URL |
|-------------|---------------------|
| This repo’s Pages site | `https://bkasiraju.github.io` |
| Optional: fork under another user/org | `https://YOUR_USER.github.io` |

GitHub serves project sites at `https://USER.github.io/REPO/` but the **`Origin` header is still `https://USER.github.io`** — do **not** include `/Release-Review-Tracker`.

For **local testing** with `python3 server.py` on port 8282:

| Environment | Allowed origin URL |
|-------------|---------------------|
| Local dashboard | `http://localhost:8282` |

Use **HTTPS** for Pages; use **HTTP** for localhost only if that matches how you open the app.

## Salesforce Setup (GusProduction / GUS org)

You need **Customize Application** or equivalent admin permission.

1. Log into **GUS** as an admin (same org your token targets):  
   `https://gus.my.salesforce.com` (or your My Domain URL).

2. Open **Setup** (gear → Setup).

3. In **Quick Find**, search **`CORS`** (or **Cross-Origin Resource Sharing**).

4. Open **CORS** → **Allowed Origins** (wording may be “Allowed Origins List” / **New**).

5. Click **New** and add:
   - **Origin URL Pattern**: `https://bkasiraju.github.io`
   - Save.

6. Repeat for `http://localhost:8282` if developers need local browser REST.

7. If your org exposes a separate control **Enable CORS for OAuth endpoints** and you use OAuth from the browser, enable it per org policy; for **session/access token pasted into Settings**, the **Allowed Origins** entry above is the critical piece for REST **query** and **PATCH**.

## Verify

1. Deploy **main** to GitHub Pages and open the live URL.

2. **API Settings**: save **Instance URL** `https://gus.my.salesforce.com` and a valid **access token** (e.g. from `sf org display` or `sid` cookie).

3. Open **DevTools → Network**. Trigger **Refresh** or load a release.

4. Select a request to `gus.my.salesforce.com/services/data/...`

5. Response headers should include **`Access-Control-Allow-Origin: https://bkasiraju.github.io`** (or mirror your request `Origin`). If you see **403** on **OPTIONS** preflight, the origin is still not allowlisted.

## Security notes

- The token in **sessionStorage** is visible to scripts on that origin—only use **HTTPS** on Pages and avoid shared machines.

- Restrict CORS origins to the minimum set (your `github.io` origin + localhost for dev); avoid wildcards unless org policy allows and risk is accepted.

- If IT blocks browser-to-Salesforce access even with CORS, use **gus-apps** or **`python3 server.py`** instead; those paths do not rely on browser CORS to Salesforce.
