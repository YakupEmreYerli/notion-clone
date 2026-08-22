#!/usr/bin/env bash
# Pushes the convex/ functions to the self-hosted Convex backend.
# Safe to re-run: Convex only applies what actually changed.
set -euo pipefail

if [ -z "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]; then
  echo "[convex-deploy] CONVEX_SELF_HOSTED_ADMIN_KEY is not set — skipping."
  echo "[convex-deploy] Generate one with:"
  echo "  docker compose exec convex-backend ./generate_admin_key.sh"
  exit 0
fi

echo "[convex-deploy] waiting for ${CONVEX_SELF_HOSTED_URL} ..."
for _ in $(seq 1 60); do
  if wget -q --spider "${CONVEX_SELF_HOSTED_URL}/version" 2>/dev/null; then
    break
  fi
  sleep 2
done

# auth.config.js reads this from the deployment's environment at push time.
npx convex env set CONVEX_AUTH_ISSUER "${CONVEX_AUTH_ISSUER}"

npx convex deploy -y

echo "[convex-deploy] done."
