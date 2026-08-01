Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background brush (Vibrant Indigo)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 99, 102, 241))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

# White Mic Capsule
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillRectangle($whiteBrush, 206, 120, 100, 180)

# Mic Arc
$whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 24)
$g.DrawArc($whitePen, 156, 160, 200, 180, 0, 180)

# Stand Base
$g.DrawLine($whitePen, 256, 340, 256, 400)
$g.DrawLine($whitePen, 196, 400, 316, 400)

$bmp.Save("electron/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Write-Host "Created 512x512 electron/icon.png"
