Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WindowsKeyboard {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void SendCtrlV() {
        keybd_event(0x11, 0, 0, UIntPtr.Zero); // VK_CONTROL down
        keybd_event(0x56, 0, 0, UIntPtr.Zero); // VK_V down
        keybd_event(0x56, 0, 2, UIntPtr.Zero); // VK_V up
        keybd_event(0x11, 0, 2, UIntPtr.Zero); // VK_CONTROL up
    }
}
"@
[WindowsKeyboard]::SendCtrlV()
