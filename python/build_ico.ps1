Add-Type -AssemblyName System.Drawing

$src = "C:\Users\oyilmaz\.gemini\antigravity\brain\eea86711-7b96-4e66-9c20-0032c8cfc3ad\.user_uploaded\media__1785544573388.png"
$iconPng = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\icon.png"
$iconIco = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\icon.ico"
$trayPng = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\tray.png"

# 1. Resize source to 256x256 PNG for icon.png
$img = [System.Drawing.Image]::FromFile($src)
$bmp256 = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp256)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 256, 256)
$bmp256.Save($iconPng, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp256.Dispose()
$img.Dispose()

Write-Host "Created 256x256 electron/icon.png"

# 2. Build high-res 256x256 PNG-embedded Windows ICO
$pngBytes = [System.IO.File]::ReadAllBytes($iconPng)
$pngLen = $pngBytes.Length

$b0 = [byte]($pngLen -band 0xFF)
$b1 = [byte](($pngLen -shr 8) -band 0xFF)
$b2 = [byte](($pngLen -shr 16) -band 0xFF)
$b3 = [byte](($pngLen -shr 24) -band 0xFF)

$icoHeader = [byte[]](
    0, 0,       # Reserved
    1, 0,       # Type 1 (ICO)
    1, 0,       # Count 1
    0,          # Width 256 (0)
    0,          # Height 256 (0)
    0,          # Color count
    0,          # Reserved
    1, 0,       # Planes 1
    32, 0,      # BPP 32
    $b0, $b1, $b2, $b3, # PNG Length
    22, 0, 0, 0 # Offset 22
)

$fs = [System.IO.File]::Create($iconIco)
$fs.Write($icoHeader, 0, $icoHeader.Length)
$fs.Write($pngBytes, 0, $pngBytes.Length)
$fs.Close()

Write-Host "Created valid 256x256 Windows ICO: electron/icon.ico"

# 3. Create 64x64 tray.png
$imgTray = [System.Drawing.Image]::FromFile($src)
$bmp64 = New-Object System.Drawing.Bitmap(64, 64)
$g2 = [System.Drawing.Graphics]::FromImage($bmp64)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($imgTray, 0, 0, 64, 64)
$bmp64.Save($trayPng, [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp64.Dispose()
$imgTray.Dispose()

Write-Host "Created 64x64 electron/tray.png"
