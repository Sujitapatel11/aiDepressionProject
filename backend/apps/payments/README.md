# SoulCare payments foundation

This app provides the first server-side subscription/payment foundation. It is not yet a production-approved merchant integration.

## Current scope

- NPR subscription plans can be configured in Django admin.
- Authenticated users can create checkout sessions through eSewa or Khalti.
- Amounts and currencies are read from server-side plans; clients cannot set a payable amount.
- eSewa response signatures and transaction identifiers are checked.
- Khalti completion is confirmed using the server-to-server lookup API.
- Subscription activation is idempotent and occurs only after provider verification.
- Payment transactions and subscription records are persisted.

## Important current limitations

- No subscription plans are seeded. Create each plan in Django admin. Use distinct codes per currency (for example `premium-monthly-npr`).
- eSewa and Khalti adapters currently accept NPR plans only.
- No India UPI or international-card provider is implemented.
- No recurring auto-renewal, cancellation portal, refunds, tax calculation, creator withdrawals, or automated cross-border payouts.
- The browser is returned to a backend JSON response after gateway verification. A polished frontend return/receipt page still needs wiring.
- Provider merchant approval and credentials are mandatory for live transactions. Do not use personal wallet credentials or another person's merchant account.
- Verify current gateway onboarding, API contract, compliance and merchant eligibility directly with each provider before taking live customer money.

## Environment variables (Render backend)

Required for both providers:

- `BACKEND_URL`: public HTTPS base URL for Django API, e.g. `https://your-api.example.com`.
- `FRONTEND_URL`: public HTTPS frontend base URL.

eSewa:

- `ESEWA_PRODUCT_CODE`
- `ESEWA_SECRET_KEY`
- Optional `ESEWA_FORM_URL` (defaults to the eSewa production form endpoint)

Khalti:

- `KHALTI_SECRET_KEY`
- Optional `KHALTI_INITIATE_URL` (defaults to Khalti production initiate endpoint)
- Optional `KHALTI_LOOKUP_URL` (defaults to Khalti production lookup endpoint)

Set secrets only in the backend hosting provider's encrypted environment-variable settings. Never commit them or send them in chat.

## API

- `GET /api/payments/plans/` — active plans (public)
- `POST /api/payments/checkout/` — authenticated checkout creation
  - JSON: `{"plan_code":"premium-monthly-npr","currency":"NPR","provider":"esewa"}`
  - Header: `Idempotency-Key: <unique-random-value>`
  - Khalti may also receive `customer_info.phone`.
  - eSewa returns `checkout_url` and form fields; the frontend must POST those fields to the returned eSewa URL.
  - Khalti returns `checkout_url`; redirect the customer to it.
- `GET|POST /api/payments/return/esewa/` — verifies eSewa callback server-side
- `GET|POST /api/payments/return/khalti/` — verifies Khalti via lookup

## Deploy sequence

1. Review and merge this branch only after CI and code review pass.
2. Back up production database.
3. Deploy backend and run `python manage.py migrate`.
4. Add merchant-approved secrets to Render.
5. Create reviewed plans in Django admin.
6. Run a low-value controlled live transaction, confirm gateway dashboard settlement and the corresponding database records.
7. Only then expose live checkout to customers.

Never set a transaction to paid based on a frontend redirect or client-supplied status.
