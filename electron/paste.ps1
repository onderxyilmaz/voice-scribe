# Ctrl+V paste helper (fallback when paste.exe is missing)
Start-Sleep -Milliseconds 80

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WindowsKeyboard {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public static void SendCtrlV() {
        // Release hotkey modifiers that may still be held
        keybd_event(0x11, 0, 2, UIntPtr.Zero); // VK_CONTROL up
        keybd_event(0x10, 0, 2, UIntPtr.Zero); // VK_SHIFT up
        keybd_event(0x20, 0, 2, UIntPtr.Zero); // VK_SPACE up
        System.Threading.Thread.Sleep(20);

        keybd_event(0x11, 0, 0, UIntPtr.Zero); // VK_CONTROL down
        keybd_event(0x56, 0, 0, UIntPtr.Zero); // VK_V down
        System.Threading.Thread.Sleep(15);
        keybd_event(0x56, 0, 2, UIntPtr.Zero); // VK_V up
        keybd_event(0x11, 0, 2, UIntPtr.Zero); // VK_CONTROL up
    }
}
"@
[WindowsKeyboard]::SendCtrlV()
