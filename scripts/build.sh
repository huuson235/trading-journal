#!/usr/bin/env sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_DIST="$ROOT/backend/dist"

echo "Building frontend..."
cd "$FRONTEND_DIR"
npm run build

echo "Copying to backend/dist..."
rm -rf "$BACKEND_DIST"
mkdir -p "$BACKEND_DIST"
cp -r "$FRONTEND_DIR/dist/"* "$BACKEND_DIST/"

echo "Done. Static files at backend/dist"
