using System;
using System.Runtime.InteropServices;
using System.Threading;

public class FastPaste {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public static void Main(string[] args) {
        // Give 80ms for physical key release
        Thread.Sleep(80);

        // Ensure hotkey modifiers are released from OS queue
        keybd_event(0x11, 0, 2, UIntPtr.Zero); // VK_CONTROL up
        keybd_event(0x10, 0, 2, UIntPtr.Zero); // VK_SHIFT up
        keybd_event(0x20, 0, 2, UIntPtr.Zero); // VK_SPACE up

        Thread.Sleep(20);

        // Press Ctrl + V
        keybd_event(0x11, 0, 0, UIntPtr.Zero); // VK_CONTROL down
        keybd_event(0x56, 0, 0, UIntPtr.Zero); // VK_V down
        Thread.Sleep(15);
        keybd_event(0x56, 0, 2, UIntPtr.Zero); // VK_V up
        keybd_event(0x11, 0, 2, UIntPtr.Zero); // VK_CONTROL up
    }
}
