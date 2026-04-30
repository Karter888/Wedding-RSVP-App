# Wedding Invitation and RSVP App

Full-stack wedding invitation and RSVP web application built with:

- Frontend: React + Vite + Tailwind CSS
- Backend: Supabase (Postgres + Edge Functions)
- Admin auth: Clerk
- Messaging: Twilio WhatsApp with EmailJS fallback
- QR: `qrcode`
- Hosting target: Vercel

## Environment Variables

Create your local environment file from the template:

```bash
cp .env.example .env
```

Required frontend variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

Required Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `APP_BASE_URL`

APP_BASE_URL usage:

- Local development: `APP_BASE_URL=https://localhost:5173`
- Production: set it to your live domain, for example `https://your-domain.com`

## Setup

1. Install frontend packages:

```bash
npm install
```

2. Configure frontend environment variables:

```bash
cp .env.example .env
```

3. Start frontend:

```bash
npm run dev
```

4. Run Supabase locally (optional):

```bash
supabase start
```

## App Routes

- `/` Invitation page
- `/rsvp` RSVP submission form
- `/ticket/:guestId` Ticket details and QR page
- `/admin/sign-in` Clerk sign-in
- `/admin` Protected dashboard (overview, guest list, scanner, export)

## Features Implemented

- Elegant invitation page with event details and countdown
- RSVP flow with validation and localStorage retry on failure
- Supabase table submission and ticket generation
- QR generation with retry behavior
- Single-use check-in via token validation in Supabase
- Messaging pipeline:
	- WhatsApp via Twilio
	- Email via EmailJS (sent independently)
- Admin dashboard:
	- Overview stats
	- Filterable/searchable guest list
	- Resend QR and manual check-in
	- Camera QR scanner
	- PDF export
	- Batch thank-you trigger (100 batch)

## Notes

- This project expects proper Supabase and Clerk configuration before production use.
- Add Supabase RLS policies before production deployment.

## Deployment Checklist

1. Frontend platform
- Use Vercel for the React app (this repo already includes `vercel.json` with SPA rewrite).

2. Supabase setup
- Apply `supabase/schema.sql` to your Supabase project.
- Deploy edge functions:
```bash
supabase functions deploy submit-rsvp
supabase functions deploy get-ticket-by-guest-id
supabase functions deploy send-invitation-message
supabase functions deploy send-thank-you-messages
supabase functions deploy validate-and-check-in
supabase functions deploy admin-list-guests
supabase functions deploy admin-update-check-in
```
- Set function secrets in Supabase:
```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM=... APP_BASE_URL=https://your-domain.com
```

## Tiny Deploy Script

From project root, you can use this short command sequence:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy submit-rsvp
supabase functions deploy get-ticket-by-guest-id
supabase functions deploy send-invitation-message
supabase functions deploy send-thank-you-messages
supabase functions deploy validate-and-check-in
supabase functions deploy admin-list-guests
supabase functions deploy admin-update-check-in
supabase secrets set SUPABASE_URL=<your-supabase-url> SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> TWILIO_ACCOUNT_SID=<your-twilio-sid> TWILIO_AUTH_TOKEN=<your-twilio-token> TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 APP_BASE_URL=https://your-domain.com
```

For local testing only, keep APP_BASE_URL as `https://localhost:5173` in your local env/secrets.

3. Clerk setup
- In Clerk dashboard, add your production domain.
- Verify `/admin/sign-in` works on production domain.

4. EmailJS setup
- Confirm your template fields match keys sent by the app:
`to_email`, `guest_name`, `ticket_url`, `qr_code_image_url`.

5. Twilio WhatsApp setup
- Use a WhatsApp-enabled sender in `TWILIO_WHATSAPP_FROM`.
- If using sandbox, join each test recipient to the sandbox first.

6. Production environment variables in Vercel
- Add all `VITE_*` variables from `.env.example`.
- Redeploy after setting variables.

7. Smoke tests after deploy
- Submit RSVP with phone + email and confirm both channels are attempted.
- Open `/admin` and confirm overview counts + guest table values.
- Export PDF and verify tables/checkboxes render correctly.
- Scan a ticket from `/scanner` and confirm check-in status updates.


