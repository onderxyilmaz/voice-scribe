Add-Type -AssemblyName System.Drawing

$src = "C:\Users\oyilmaz\.gemini\antigravity\brain\eea86711-7b96-4e66-9c20-0032c8cfc3ad\.user_uploaded\media__1785544573388.png"
$iconPng = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\icon.png"
$iconIco = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\icon.ico"
$trayPng = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\tray.png"

# Copy as high-res icon.png
Copy-Item -Path $src -Destination $iconPng -Force
Write-Host "Updated electron/icon.png"

# Convert to icon.ico
$img = [System.Drawing.Image]::FromFile($src)
$thumb = $img.GetThumbnailImage(256, 256, $null, [IntPtr]::Zero)
$bmp = New-Object System.Drawing.Bitmap($thumb)
$hIcon = $bmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)

$stream = New-Object System.IO.FileStream($iconIco, [System.IO.FileMode]::Create)
$ico.Save($stream)
$stream.Close()
$bmp.Dispose()
$img.Dispose()
Write-Host "Generated electron/icon.ico"

# Convert to tray.png (64x64)
$img2 = [System.Drawing.Image]::FromFile($src)
$trayBmp = New-Object System.Drawing.Bitmap(64, 64)
$g = [System.Drawing.Graphics]::FromImage($trayBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img2, 0, 0, 64, 64)
$trayBmp.Save($trayPng, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$trayBmp.Dispose()
$img2.Dispose()
Write-Host "Generated electron/tray.png"
