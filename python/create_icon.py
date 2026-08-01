from PIL import Image, ImageDraw

def create_app_icon():
    # Generate high-resolution 512x512 PNG icon for Windows electron-builder
    size = (512, 512)
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Rounded rectangle background with vibrant gradient
    draw.rounded_rectangle([16, 16, 496, 496], radius=96, fill=(99, 102, 241, 255))
    
    # Inner glowing border
    draw.rounded_rectangle([24, 24, 488, 488], radius=88, outline=(255, 255, 255, 120), width=6)

    # Microphone Icon Visual
    # Mic capsule
    draw.rounded_rectangle([216, 120, 296, 280], radius=40, fill=(255, 255, 255, 255))

    # Mic stand arc
    draw.arc([166, 180, 346, 320], start=0, end=180, fill=(255, 255, 255, 255), width=20)
    
    # Stand vertical line & base
    draw.line([256, 320, 256, 380], fill=(255, 255, 255, 255), width=20)
    draw.line([206, 380, 306, 380], fill=(255, 255, 255, 255), width=20)

    image.save("electron/icon.png", "PNG")
    print("✓ Created 512x512 high-res electron/icon.png")

    # Generate 64x64 tray icon
    tray = image.resize((64, 64), Image.Resampling.LANCZOS)
    tray.save("electron/tray.png", "PNG")
    print("✓ Created 64x64 electron/tray.png")

if __name__ == "__main__":
    create_app_icon()
