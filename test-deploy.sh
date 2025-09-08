#!/bin/bash

# Script to test and debug share links on Vercel

echo "=== Testing Share Links Debug ==="

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

echo "1. Building project..."
npm run build

echo "2. Deploying to Vercel..."
vercel --prod

echo "3. Getting deployment URL..."
DEPLOY_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^[:space:]]*')

if [ -z "$DEPLOY_URL" ]; then
    echo "Could not get deployment URL. Please check manually."
    exit 1
fi

echo "Deployed to: $DEPLOY_URL"

echo "4. Testing debug endpoints..."
echo "Environment check: $DEPLOY_URL/api/debug/env"
echo "Blob URL test: $DEPLOY_URL/api/debug/blob-urls"

echo "5. Testing share resolution..."
echo "Visit your app to create a share link, then test it."

echo "6. Check Vercel function logs:"
echo "vercel logs --follow"

echo "=== Done ==="
