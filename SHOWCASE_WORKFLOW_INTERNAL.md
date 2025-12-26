# QFT Ecosystem: Showcase Workflow (Phase 0)

## Overview
This document outlines the end-to-end workflow for the "Showcase" feature, enabling users to upload content via the web app, which is then processed by the Agent and posted to Discord as an embed. All steps must adhere to Zero-Knowledge and RBAC constraints.

---

## 1. Web Upload Interface (Frontend)
- Users (with appropriate RBAC tier) access the Showcase upload page.
- Upload form accepts files (images, videos, docs) and metadata (title, description, tags).
- On submit, data is sent to the API Gateway (not directly to the Agent or Discord).
- No PII or sensitive user data is included in the payload.

## 2. API Gateway (Backend)
- Receives upload requests from the frontend.
- Validates RBAC tier and file type/size.
- Issues an anonymous, signed token for the upload (Zero-Knowledge principle).
- Forwards sanitized payload and token to the Agent service.

## 3. Agent Layer (Orchestration)
- Receives payload and token from API Gateway.
- Verifies token authenticity and RBAC tier.
- Processes file (e.g., virus scan, format check, optional watermarking).
- Prepares Discord embed (title, description, media preview, attribution as anonymous token or pseudonym).
- Posts embed to designated Discord channel via Bot.
- Logs event for audit (no PII).

## 4. Discord Delivery
- Embed appears in the target channel with media, metadata, and anonymous attribution.
- Optionally, a link back to the web app for further engagement.

## 5. Security & Privacy
- All user actions are RBAC-gated at both frontend and API Gateway.
- No direct user identifiers are passed to the Agent or Discord.
- All tokens are time-limited and signed.
- Audit logs contain only anonymous or pseudonymous references.

---

## Next Steps
- Implement API Gateway endpoint for uploads.
- Build/upload UI in frontend with RBAC checks.
- Extend Agent logic for file processing and Discord posting.
- Test end-to-end with dummy data.

---

_This document is for internal planning and architecture alignment. Do not distribute externally._
