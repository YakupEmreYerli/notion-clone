# Zotion

This project is a simplified clone of the popular productivity application, Notion. It's designed to replicate some of the core features of Notion, providing a platform where users can create, edit, and organize their notes in a flexible and intuitive interface.

Zotion is **fully self-hostable** — there is no SaaS dependency anywhere in the stack:

| Concern              | Service                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| Real-time database   | [self-hosted Convex](https://github.com/get-convex/convex-backend)            |
| Authentication       | [Better Auth](https://better-auth.com) (email + password), backed by Postgres |
| File / cover storage | [MinIO](https://min.io) or any S3-compatible bucket                           |
| App                  | Next.js, served from a standalone Docker image                                |

Everything runs from a single `docker-compose.yml` and keeps its state in named volumes.

## Features

### Productivity and Organization

- 📝 Notion-style editor for seamless note-taking
- 📂 Infinite children documents for hierarchical organization
- 🖐️ Drag-and-drop reordering for intuitive file management
- ⭐ Pin important documents for quick access
- ➡️🔀⬅️ Expandable and fully collapsible sidebar for easy navigation
- 🎨 Customizable icons for each document, updating in real-time
- 🗑️ Trash can with soft delete and file recovery options

### User Experience

- 🌓 Light and Dark mode to suit preferences
- 📱 Full mobile responsiveness for productivity on the go
- 🛬 Landing page for a welcoming user entry point
- 🖼️ Cover image for each document to add a personal touch

### Data Management

- 🔄 Real-time database for instant data updates
- 📤📥 File upload, deletion, and replacement options

### Security and Sharing

- 🔐 Authentication to secure notes
- 🌍 Option to publish your note to the web for sharing

## Technologies

![NextJS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![Shadcn-ui](https://img.shields.io/badge/shadcn/ui-000000.svg?style=for-the-badge&logo=shadcn/ui&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC.svg?style=for-the-badge&logo=Tailwind-CSS&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better%20Auth-000000.svg?style=for-the-badge&logo=betterauth&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-ee342f.svg?style=for-the-badge&logo=Convex&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-C72E49.svg?style=for-the-badge&logo=minio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED.svg?style=for-the-badge&logo=docker&logoColor=white)
![Blocknote](https://img.shields.io/badge/Blocknote-ff8c00.svg?style=for-the-badge&logo=Blocknote&logoColor=white)
![dnd-kit](https://img.shields.io/badge/dnd--kit-000000?style=for-the-badge&logo=react&logoColor=white)

## How authentication works

Better Auth issues a short-lived RS256 JWT (`GET /api/auth/token`) for the
signed-in session. Convex verifies it against the JWKS advertised at
`<APP_URL>/.well-known/openid-configuration`, so `ctx.auth.getUserIdentity()`
keeps working exactly as before — `identity.subject` is now the Better Auth
user id.

Two consequences worth knowing:

- `APP_URL` must be reachable **from the Convex backend container**.
- Changing `APP_URL` invalidates existing tokens (users just sign in again),
  but never the stored documents.

## Self-hosting with Docker Compose

1. Clone the repository and create your env file:

```bash
cp .env.example .env
```

2. Generate the secrets:

```bash
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -hex 32      # CONVEX_INSTANCE_SECRET
openssl rand -hex 16      # POSTGRES_PASSWORD / S3_SECRET_ACCESS_KEY
```

Set `APP_URL` and `NEXT_PUBLIC_CONVEX_URL` to the two public hostnames you
will use.

3. Start the stack:

```bash
docker compose up -d --build
```

4. Generate a Convex admin key and push the functions:

```bash
docker compose exec convex-backend ./generate_admin_key.sh
# paste the key into .env as CONVEX_SELF_HOSTED_ADMIN_KEY, then:
docker compose up convex-deploy
```

The `convex-deploy` service is idempotent — it re-runs on every
`docker compose up` and only pushes what actually changed.

5. Open `APP_URL`, create an account and start writing.

### Volumes

| Volume          | Contents                                      |
| --------------- | --------------------------------------------- |
| `postgres_data` | Convex documents + Better Auth users/sessions |
| `convex_data`   | Convex backend working state                  |
| `minio_data`    | Uploaded covers, images and files             |

## Deploying on Dokploy

1. **Create a Compose service** in Dokploy pointing at this repository
   (Provider: Git, Compose Path: `./docker-compose.yml`).
2. **Paste your `.env`** into the service's _Environment_ tab. At minimum:
   `APP_URL`, `NEXT_PUBLIC_CONVEX_URL`, `BETTER_AUTH_SECRET`,
   `POSTGRES_PASSWORD`, `CONVEX_INSTANCE_SECRET`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`.
3. **Add two domains** under _Domains_:
   - `zotion.example.com` → service `web`, container port `3000`
   - `convex.example.com` → service `convex-backend`, container port `3210`

   Enable HTTPS (Let's Encrypt) on both. These must match `APP_URL` and
   `NEXT_PUBLIC_CONVEX_URL`. Optionally add a third domain for
   `convex-dashboard` on port `6791`.

4. **Deploy.** Then open the service terminal and run
   `./generate_admin_key.sh` inside `convex-backend`, put the key in
   `CONVEX_SELF_HOSTED_ADMIN_KEY` and redeploy so `convex-deploy` can push the
   functions.

Notes for reverse-proxy setups:

- The Convex domain must allow **WebSocket upgrades** (Traefik does by
  default).
- If uploads larger than a few MB fail, raise the proxy body-size limit and
  `MAX_UPLOAD_SIZE`.
- MinIO is never exposed publicly: files are streamed through the app at
  `/api/files/<key>`.

## Local development

```bash
npm install
cp .env.example .env

# infrastructure only
docker compose up -d postgres minio minio-init convex-backend

# push the Convex functions (needs CONVEX_SELF_HOSTED_URL + admin key)
npm run convex:dev

# in another terminal
npm run dev
```

For local runs set `APP_URL=http://localhost:3000`,
`NEXT_PUBLIC_CONVEX_URL=http://localhost:3210`,
`S3_ENDPOINT=http://localhost:9000` and expose the corresponding ports.

The Better Auth tables are created automatically the first time the server
boots (`AUTH_AUTO_MIGRATE=false` disables this).

## Acknowledgements

[CodewithAntonio](https://www.youtube.com/@codewithantonio)
