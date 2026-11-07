# Deploy SplitPay from the Terminal

This guide deploys the React/Vite frontend to Vercel and the FastAPI API to Render using their CLIs. Run the steps from a clean, committed release on the `main` branch. Do not enter real personal or financial information: this is a public demo, every visitor shares the same data, and an API restart rebuilds the database from its seed.

## 1. Check the local build

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
deactivate
cd ../frontend
npm ci
npm run build
cd ..
```

Commit and merge the intended changes to `main` using the repository's Git workflow before creating the Render service. Render will deploy the `main` branch.

## 2. Create the first Vercel deployment

The first deploy establishes the stable production domain that the API must allow through CORS. The app's API calls will not work yet; this is a temporary setup step.

```bash
cd frontend
vercel login
vercel link
```

When prompted, create or select the SplitPay project and keep `frontend/` as the Vercel project root. Then deploy:

```bash
vercel --prod
```

Copy the **production alias** shown by the CLI, such as `https://splitpay-example.vercel.app`. Do not use a preview deployment URL. Keep this terminal in `frontend/`.

The committed `frontend/vercel.json` sends deep links to the SPA entry point, so routes such as `/inicio` and `/extrato/1` also load when opened directly.

## 3. Create and deploy the API on Render

Open another terminal at the repository root and authenticate:

```bash
render login
render services create --help
```

The Git repository must be accessible to the Render account. Replace `https://your-project.vercel.app` below with the production alias copied in the previous step. The example uses the free plan and Oregon; change the region if needed.

```bash
render services create \
  --name splitpay-api \
  --type web_service \
  --repo https://github.com/vininoronha21/splitpay-fintech \
  --branch main \
  --runtime python \
  --region oregon \
  --plan free \
  --root-directory backend \
  --build-command "pip install -r requirements.txt" \
  --start-command 'uvicorn app.main:app --host 0.0.0.0 --port $PORT' \
  --health-check-path /health \
  --env-var FRONTEND_ORIGIN=https://your-project.vercel.app \
  --output json
```

Use the service ID and `onrender.com` URL returned by the CLI. If the service was created but its first deploy did not start, trigger one and wait for it:

```bash
render deploys create SERVICE_ID --wait
```

The API binds to Render's `PORT`. `FRONTEND_ORIGIN` must be the exact Vercel production origin, with no trailing slash or path.

## 4. Set the API URL in Vercel and redeploy

Return to the terminal in `frontend/`, add the Render URL as a **Production** environment variable, and enter the API's base URL when prompted (for example, `https://splitpay-api.onrender.com`):

```bash
vercel env add VITE_API_URL production
vercel --prod
```

`VITE_API_URL` is embedded during the Vite build. Redeploy after changing it; changing a Render environment variable alone does not update the frontend bundle.
If `VITE_API_URL` already exists in the Production environment, use `vercel env update VITE_API_URL production` instead of `vercel env add`.

## 5. Verify the public deployment

Replace the example domains with the production URLs:

```bash
curl --fail https://splitpay-api.onrender.com/health
curl --fail --output /dev/null --write-out '%{http_code}\n' https://splitpay-api.onrender.com/docs
curl --fail --output /dev/null --write-out '%{http_code}\n' https://splitpay-example.vercel.app/
curl --fail --output /dev/null --write-out '%{http_code}\n' https://splitpay-example.vercel.app/inicio
curl --fail --output /dev/null --write-out '%{http_code}\n' https://splitpay-example.vercel.app/extrato/1
```

Expected: `/health` returns `{"status":"ok"}`; `/docs`, the landing page, and the deep links return HTTP 200. Open the Vercel site in a browser and confirm API data loads and a normal API action succeeds.

Before a presentation, open `/health` to wake a free Render instance. Its first response can be delayed after inactivity. The demo database is shared by all visitors and is recreated from seed data whenever the API starts; do not enter sensitive or real financial data.

After verification, update the README's unpublished-demo notice with the production Vercel URL and link the public API documentation at `/docs`.

## Later deployments

Deploy frontend changes from `frontend/`:

```bash
vercel --prod
```

To redeploy the Render service manually, find its ID and wait for the deployment:

```bash
render services --output json
render deploys create SERVICE_ID --wait
```

CLI output and service subcommands can change; confirm available flags with `render services create --help` or `render deploys create --help`.

## Official CLI references

- [Render CLI](https://render.com/docs/cli)
- [Render CLI command reference](https://render.com/docs/cli-reference)
- [Vercel CLI deploy](https://vercel.com/docs/cli/deploy)
- [Vercel CLI environment variables](https://vercel.com/docs/cli/env)
- [Vite on Vercel: SPA deep links](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas)
