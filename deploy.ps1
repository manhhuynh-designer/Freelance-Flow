# PowerShell script to deploy and test
Write-Host "=== Deploying Share Link Fix ===" -ForegroundColor Green

# Add all changes
Write-Host "1. Adding files..." -ForegroundColor Yellow
git add .

# Commit changes
Write-Host "2. Committing changes..." -ForegroundColor Yellow
git commit -m "Fix share links: improve debug logging and remove hardcoded env vars"

# Push to GitHub
Write-Host "3. Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "4. Deploy completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to Vercel Dashboard -> Project Settings -> Environment Variables"
Write-Host "2. Ensure these variables are set for Production:"
Write-Host "   - BLOB_READ_WRITE_TOKEN"
Write-Host "   - VERCEL_BLOB_STORE_URL"
Write-Host "   - NEXTAUTH_SECRET"
Write-Host "   - GOOGLE_CLIENT_ID"
Write-Host "   - GOOGLE_CLIENT_SECRET"
Write-Host ""
Write-Host "3. After setting env vars, redeploy or wait for auto-deploy"
Write-Host "4. Test debug endpoints:"
Write-Host "   - https://your-app.vercel.app/api/debug/env"
Write-Host "   - https://your-app.vercel.app/api/debug/blob-urls"
Write-Host ""
Write-Host "5. Monitor Vercel function logs for detailed error info"
