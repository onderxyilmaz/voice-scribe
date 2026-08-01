Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public class IconFactory {
    public static void CreateIco(string sourceImg, string outputIco) {
        int[] sizes = new int[] { 256, 128, 64, 48, 32, 16 };
        byte[][] pngBuffers = new byte[sizes.Length][];
        
        using (Image src = Image.FromFile(sourceImg)) {
            for (int i = 0; i < sizes.Length; i++) {
                int s = sizes[i];
                using (Bitmap bmp = new Bitmap(s, s)) {
                    using (Graphics g = Graphics.FromImage(bmp)) {
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.DrawImage(src, 0, 0, s, s);
                    }
                    using (MemoryStream ms = new MemoryStream()) {
                        bmp.Save(ms, ImageFormat.Png);
                        pngBuffers[i] = ms.ToArray();
                    }
                }
            }
        }

        using (FileStream fs = new FileStream(outputIco, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs)) {
            bw.Write((short)0);
            bw.Write((short)1);
            bw.Write((short)sizes.Length);

            int offset = 6 + (sizes.Length * 16);

            for (int i = 0; i < sizes.Length; i++) {
                int s = sizes[i];
                bw.Write((byte)(s == 256 ? 0 : s));
                bw.Write((byte)(s == 256 ? 0 : s));
                bw.Write((byte)0);
                bw.Write((byte)0);
                bw.Write((short)1);
                bw.Write((short)32);
                bw.Write((int)pngBuffers[i].Length);
                bw.Write((int)offset);
                offset += pngBuffers[i].Length;
            }

            for (int i = 0; i < sizes.Length; i++) {
                bw.Write(pngBuffers[i]);
            }
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

$iconSrc = "C:\Users\oyilmaz\.gemini\antigravity\brain\eea86711-7b96-4e66-9c20-0032c8cfc3ad\.user_uploaded\media__1785545704006.jpg"
$splashSrc = "C:\Users\oyilmaz\.gemini\antigravity\brain\eea86711-7b96-4e66-9c20-0032c8cfc3ad\.user_uploaded\media__1785544367223.png"

$iconPng = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\icon.png"
$iconIco = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\icon.ico"
$trayPng = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\tray.png"
$splashPng = "c:\Users\oyilmaz\Desktop\Calismalarim\Antigravity\Transkript\electron\splash.png"

Copy-Item -Path $splashSrc -Destination $splashPng -Force
Write-Host "Updated electron/splash.png"

$img = [System.Drawing.Image]::FromFile($iconSrc)
$bmp512 = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($bmp512)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 512, 512)
$bmp512.Save($iconPng, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp512.Dispose()
$img.Dispose()
Write-Host "Created 512x512 electron/icon.png"

$imgTray = [System.Drawing.Image]::FromFile($iconSrc)
$bmp64 = New-Object System.Drawing.Bitmap(64, 64)
$g2 = [System.Drawing.Graphics]::FromImage($bmp64)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($imgTray, 0, 0, 64, 64)
$bmp64.Save($trayPng, [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp64.Dispose()
$imgTray.Dispose()
Write-Host "Created 64x64 electron/tray.png"

[IconFactory]::CreateIco($iconSrc, $iconIco)
Write-Host "Successfully generated multi-res electron/icon.ico"
