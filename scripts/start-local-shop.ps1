$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$localDir = Join-Path $projectRoot '.local'
$nodeExe = Join-Path $localDir 'node.exe'
if (-not (Test-Path -LiteralPath $nodeExe)) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }
function Test-LocalPort([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try { $task = $client.ConnectAsync('127.0.0.1', $Port); if ($task.Wait(500)) { return $client.Connected }; return $false } catch { return $false } finally { $client.Dispose() }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) { throw 'Missing local .env. See docs/07-Implement/校园商城/本地商城说明.md' }
New-Item -ItemType Directory -Path $localDir -Force | Out-Null
if (-not (Test-LocalPort 3307)) {
  $mysqlDir = Join-Path $localDir 'mysql-8.4.11-winx64'
  $dataDir = Join-Path $localDir 'mysql-data'
  if (-not (Test-Path -LiteralPath $dataDir)) { throw 'Local MySQL data directory is missing; do not reinitialize an existing database.' }
  Start-Process -FilePath (Join-Path $mysqlDir 'bin/mysqld.exe') -ArgumentList '--no-defaults',"--basedir=$mysqlDir","--datadir=$dataDir",'--bind-address=127.0.0.1','--port=3307','--mysqlx=OFF' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localDir 'mysql-out.log') -RedirectStandardError (Join-Path $localDir 'mysql-err.log') | Out-Null
  for ($i=0; $i -lt 30 -and -not (Test-LocalPort 3307); $i++) { Start-Sleep -Milliseconds 500 }
  if (-not (Test-LocalPort 3307)) { throw 'MySQL startup failed. Check .local/mysql-err.log' }
}
if (-not (Test-LocalPort 4040)) {
  $env:HOST = '127.0.0.1'
  Start-Process -FilePath $nodeExe -ArgumentList 'server.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localDir 'backend.log') -RedirectStandardError (Join-Path $localDir 'backend-error.log') | Out-Null
}
if (-not (Test-LocalPort 5173)) {
  Start-Process -FilePath $nodeExe -ArgumentList 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort' -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localDir 'frontend.log') -RedirectStandardError (Join-Path $localDir 'frontend-error.log') | Out-Null
}
for ($i=0; $i -lt 30 -and -not (Test-LocalPort 5173); $i++) { Start-Sleep -Milliseconds 500 }
for ($i=0; $i -lt 30 -and -not (Test-LocalPort 4040); $i++) { Start-Sleep -Milliseconds 500 }
if (-not (Test-LocalPort 4040)) { throw 'Backend startup failed. Check .local/backend-error.log' }
if (-not (Test-LocalPort 5173)) { throw 'Frontend startup failed. Check .local/frontend-error.log' }
try {
  $health = Invoke-WebRequest -Uri 'http://127.0.0.1:4040/health' -UseBasicParsing -TimeoutSec 10
  $page = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 10
  if ($health.StatusCode -ne 200 -or $page.StatusCode -ne 200) { throw 'Unexpected response' }
} catch { throw 'Local website health check failed. Check .local backend/frontend logs.' }
Write-Host 'Original home: http://127.0.0.1:5173/'
Write-Host 'Local shop: http://127.0.0.1:5173/shop'
Write-Host 'Store management: enter your store from the shop directory.'
