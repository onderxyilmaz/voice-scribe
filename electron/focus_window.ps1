# VoiceScribe — bring an existing process main window to the foreground.
# Usage: powershell -File focus_window.ps1 -ProcessName notepad
param(
  [Parameter(Mandatory = $true)]
  [string]$ProcessName
)

$ErrorActionPreference = 'SilentlyContinue'

if (-not ('VoiceScribeFocus' -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VoiceScribeFocus {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int dwProcessId);
  public const int SW_RESTORE = 9;
  public const int SW_SHOW = 5;
  public const int ASFW_ANY = -1;

  public static bool Focus(IntPtr hWnd) {
    if (hWnd == IntPtr.Zero) return false;
    AllowSetForegroundWindow(ASFW_ANY);
    if (IsIconic(hWnd)) ShowWindowAsync(hWnd, SW_RESTORE); else ShowWindowAsync(hWnd, SW_SHOW);
    IntPtr fore = GetForegroundWindow();
    uint forePid; uint targetPid;
    uint foreTid = GetWindowThreadProcessId(fore, out forePid);
    uint targetTid = GetWindowThreadProcessId(hWnd, out targetPid);
    uint curTid = GetCurrentThreadId();
    keybd_event(0x12, 0, 0, UIntPtr.Zero);
    keybd_event(0x12, 0, 2, UIntPtr.Zero);
    if (foreTid != 0 && targetTid != 0 && foreTid != targetTid) {
      AttachThreadInput(curTid, foreTid, true);
      AttachThreadInput(curTid, targetTid, true);
    }
    BringWindowToTop(hWnd);
    bool ok = SetForegroundWindow(hWnd);
    if (foreTid != 0 && targetTid != 0 && foreTid != targetTid) {
      AttachThreadInput(curTid, foreTid, false);
      AttachThreadInput(curTid, targetTid, false);
    }
    return ok;
  }
}
"@
}

$proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
  Sort-Object StartTime -Descending |
  Select-Object -First 1

if (-not $proc) {
  Write-Output 'no-window'
  exit 2
}

$ok = [VoiceScribeFocus]::Focus([IntPtr]$proc.MainWindowHandle)
if ($ok) {
  Write-Output 'focused'
  exit 0
}

# Last resort: COM activate by PID / title
$w = New-Object -ComObject WScript.Shell
$null = $w.AppActivate($proc.Id)
Start-Sleep -Milliseconds 100
$null = $w.AppActivate($proc.MainWindowTitle)
Write-Output 'activated'
exit 0
