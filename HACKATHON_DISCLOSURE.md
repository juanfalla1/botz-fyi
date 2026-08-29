# Hackathon Disclosure

This file documents what was pre-existing, what was prepared for the hackathon submission, and how Google Cloud is used by the BOTZ Operations Agent demo.

## Pre-Existing Code

BOTZ existed before the hackathon submission. The repository includes product code, experiments, integrations, and supporting workflows that were started before the hackathon period.

Pre-existing areas include, but are not limited to:

- BOTZ application shell and dashboard foundations.
- Agent, channel, CRM, and workflow concepts.
- Existing integrations and prototype directories.
- General development tooling and framework setup.

The use of pre-existing code is disclosed here so reviewers can distinguish the base product from the hackathon-specific demo work.

## Hackathon Submission Work

The hackathon submission focuses on presenting BOTZ as an agentic operations layer for business workflows.

The submitted demo highlights:

- A customer quotation request with product, quantity, delivery city, company/contact identity, and approval constraints.
- Agentic reasoning over intent and required operational fields.
- Selection of a CRM quotation workflow instead of a text-only response.
- Creation and verification of CRM-style operational records.
- Human escalation before final pricing is externally sent.
- A corrected video under 4 minutes with the product visible at the beginning.

## Google Cloud Usage

The corrected Devpost video includes direct Google Cloud evidence from the project `botz-ai-platform`.

The video shows:

- Authenticated `gcloud run services list` output.
- Cloud Run services deployed in `us-central1`.
- The Cloud Run service `genai-app-botzspeak-1-1781219389373`.
- A `.run.app` runtime URL.
- Cloud Run `Ready=True` status.
- A live HTTP request to the Cloud Run endpoint returning `HTTP_STATUS=200`.
- A response content check confirming the BOTZ Speak application response.

The demo also references Vertex AI and Gemini integration paths where configured in the broader BOTZ codebase and workflows.

## Reviewer Note

The corrected video is intended to address Devpost feedback by showing both the working product experience and concrete Google Cloud runtime evidence. The repository does not include Google Cloud credentials or secrets.
