# Run all pending migrations in order
# Usage: .\migrate.ps1 -DatabaseUrl "postgresql://user:pass@host:5432/db"

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = $env:DATABASE_URL
)

if ([string]::IsNullOrEmpty($DatabaseUrl)) {
    Write-Error "DATABASE_URL not provided. Use -DatabaseUrl parameter or set DATABASE_URL environment variable."
    exit 1
}

$MigrationsDir = Join-Path $PSScriptRoot "migrations"
Write-Host "Running migrations from $MigrationsDir" -ForegroundColor Cyan

Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Applying: $($_.Name)" -ForegroundColor Yellow
    & psql $DatabaseUrl -f $_.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Migration failed: $($_.Name)"
        exit 1
    }
}

Write-Host "All migrations completed successfully" -ForegroundColor Green
