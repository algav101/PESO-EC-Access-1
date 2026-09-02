$zipUrl = "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip"
$outDir = "$env:LOCALAPPDATA\MinGit"
$zipPath = "$env:TEMP\mingit.zip"

if (-not (Test-Path "$outDir\cmd\git.exe")) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    Write-Output "Downloading MinGit..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
    Write-Output "Extracting MinGit..."
    Expand-Archive -Path $zipPath -DestinationPath $outDir -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
}

Write-Output "MinGit ready at $outDir\cmd\git.exe"
& "$outDir\cmd\git.exe" --version
