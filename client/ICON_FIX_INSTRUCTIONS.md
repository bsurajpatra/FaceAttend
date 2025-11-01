# Icon Fix Instructions

## Issue
The current icon at `./assets/images/icon.png` has dimensions 219x230 pixels, but Expo requires icons to be square.

## Solution
1. Open your icon image in an image editor (Photoshop, GIMP, or online tool like https://www.iloveimg.com/resize-image)
2. Resize/crop the image to a square format (recommended sizes: 1024x1024 or 512x512)
3. Replace the existing `./assets/images/icon.png` with the square version
4. Ensure the icon is centered and looks good when cropped to square

## Recommended Icon Sizes
- **App Icon**: 1024x1024 pixels (square)
- **Adaptive Icon (Android)**: 1024x1024 pixels (square)
- **Splash Screen**: Can be any size, but 200x200 or larger is recommended

## Tools
- Online: https://www.iloveimg.com/resize-image
- Desktop: Photoshop, GIMP, Figma
- Command line: `sips -z 1024 1024 icon.png` (macOS)

After updating the icon, run `expo doctor` again to verify the fix.

