# WebPage-ArdonyxApps-Finance
This repo owns the public Ardonyx Finance web experience.

- `index.html` is the public landing/product page.
- `app.html` is the app UI for signup, login, Plaid Link, account sync, and transaction review.
- `oauth.html` returns Plaid OAuth institutions back to `app.html`.
- `Assets/js/env.js` sets the backend API base URL.
- `Assets/js/app.js` calls the FastAPI backend.

## Local development

Start the FastAPI backend from the app repo:

```powershell
cd ..\App-ArdonyxApps-Finance
pip install -e .
python -m ardonyx_finance.server
```

Serve this web repo on a separate local port:

```powershell
cd ..\WebPage-ArdonyxApps-Finance
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/app.html
```

For local testing, `Assets/js/env.js` should point at:

```js
window.ARDONYX_API_BASE = "http://localhost:5000";
```

The backend `.env` must allow this frontend origin:

```env
ENABLE_CORS=1
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,null
PLAID_REDIRECT_URI=http://localhost:8080/oauth.html
```

Opening `app.html` directly from the filesystem can work with the `null` CORS origin above, but using `http://localhost:8080/app.html` is the cleaner test path.

## Production API

For a separately hosted production API, update `Assets/js/env.js`:

```js
window.ARDONYX_API_BASE = "https://api.finance.ardonyxapps.com";
```

For hosted Plaid OAuth flows, set the backend `PLAID_REDIRECT_URI` to the public web URL, for example:

```env
PLAID_REDIRECT_URI=https://finance.ardonyxapps.com/oauth.html
```
