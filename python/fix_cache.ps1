$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$7zaPath = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\node_modules\7zip-bin\win\x64\7za.exe"

if (Test-Path $cacheDir) {
    $files = Get-ChildItem -Path $cacheDir -Filter "*.7z"
    foreach ($file in $files) {
        $dest = $file.FullName.Replace(".7z", "")
        if (-not (Test-Path $dest)) {
            New-Item -ItemType Directory -Path $dest -Force | Out-Null
        }
        Write-Host "Extracting cache file..."
        Start-Process -FilePath $7zaPath -ArgumentList "x `"$($file.FullName)`" `-o`"$dest`" -y" -Wait -NoNewWindow
    }
}
Write-Host "Cache extracted successfully."
