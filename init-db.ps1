#!/usr/bin/env pwsh
# Quick database initialization script
# Usage: .\init-db.ps1 [-DatabaseUrl "connection-string"]

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = $env:DATABASE_URL
)

if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    Write-Error "❌ DATABASE_URL not provided. Use -DatabaseUrl parameter or set DATABASE_URL environment variable."
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host '  .\init-db.ps1 -DatabaseUrl "postgresql://user:pass@localhost:5432/agentpress"'
    exit 1
}

Write-Host "🚀 AgentPress Database Initialization" -ForegroundColor Cyan
Write-Host ""

# Test connection
Write-Host "📡 Testing database connection..." -ForegroundColor Yellow
$testResult = & psql $DatabaseUrl -c "SELECT version();" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Database connection failed"
    Write-Host $testResult
    exit 1
}
Write-Host "✅ Connection successful" -ForegroundColor Green
Write-Host ""

# Run initialization
Write-Host "📦 Creating tables and schema..." -ForegroundColor Yellow
$initScript = Join-Path $PSScriptRoot "database-init.sql"
& psql $DatabaseUrl -f $initScript
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Database initialization failed"
    exit 1
}
Write-Host "✅ Schema created" -ForegroundColor Green
Write-Host ""

# Verify tables
Write-Host "🔍 Verifying tables..." -ForegroundColor Yellow
$tables = & psql $DatabaseUrl -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" | Where-Object { $_.Trim() -ne "" }
$tableCount = ($tables | Measure-Object).Count

if ($tableCount -eq 0) {
    Write-Error "❌ No tables found"
    exit 1
}

Write-Host "✅ Found $tableCount tables:" -ForegroundColor Green
$tables | ForEach-Object { Write-Host "   - $($_.Trim())" -ForegroundColor Gray }
Write-Host ""

Write-Host "🎉 Database initialization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Configure environment variables in .env"
Write-Host "  2. Run: npm install"
Write-Host "  3. Run: npm run build"
Write-Host "  4. Run: npm start"
