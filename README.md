# BOTZ Operations Agent

BOTZ Operations Agent turns customer conversations into auditable business actions. The demo flow shows a customer quotation request being understood, routed to a CRM quotation workflow, verified in CRM records, and held for human approval before external pricing is sent.

## Hackathon Demo

- Product: BOTZ Agents dashboard, CRM workflow, quotation workflow, channels, and escalation flow.
- Agentic loop shown: understand, reason, decide, act, verify, and escalate.
- Corrected Devpost video: product visible in the first 15 seconds and runtime under 4 minutes.
- Google Cloud proof: the corrected demo shows Cloud Run services, `.run.app` URLs, Ready status, and a live HTTP request returning `HTTP_STATUS=200` from a BOTZ Cloud Run endpoint.

## Google Cloud Evidence

The corrected demo uses authenticated `gcloud` output from the Google Cloud project `botz-ai-platform`.

Evidence shown in the video:

- `gcloud run services list --platform managed --project botz-ai-platform`
- Cloud Run region: `us-central1`
- Cloud Run service: `genai-app-botzspeak-1-1781219389373`
- Runtime URL: `https://genai-app-botzspeak-1-1781219389373-iatxcuxv6a-uc.a.run.app`
- Service status: `Ready=True`
- Live request result: `HTTP_STATUS=200`
- Response body match: `BOTZ Speak`

No secrets or credentials are stored in this repository.

## Hackathon Disclosure

See `HACKATHON_DISCLOSURE.md` for the required clarification about pre-existing code, hackathon-period work, and Google Cloud usage.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.
