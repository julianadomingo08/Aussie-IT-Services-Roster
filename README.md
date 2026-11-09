# Aussie IT Services Australia – Support Roster

Password-protected weekly roster. Static page (`index.html`) + one serverless function (`api/data.js`).
Data is stored in Upstash Redis. Two passwords: admin (can edit) and viewer (read only).

Environment variables (Vercel > Settings > Environment Variables):
- ADMIN_PASSWORD  – your password (can add/remove shifts, staff, participants)
- VIEW_PASSWORD   – shared worker password (read only)
- KV_REST_API_URL / KV_REST_API_TOKEN – added automatically when you connect Upstash Redis
  (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN also work)

Keep this repository PRIVATE. Never commit passwords or participant data.
