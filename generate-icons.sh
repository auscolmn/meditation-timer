#!/bin/bash

# Icon Generator Script for Sati
# Usage: ./generate-icons.sh path/to/your-logo.png

set -e

if [ -z "$1" ]; then
    echo "Usage: ./generate-icons.sh path/to/your-logo.png"
    echo ""
    echo "Your logo should be:"
    echo "  - Square (e.g., 512x512 or 1024x1024)"
    echo "  - PNG format with transparency (optional)"
    echo "  - Have some padding around the edges for safe area"
    exit 1
fi

LOGO="$1"

if [ ! -f "$LOGO" ]; then
    echo "Error: File '$LOGO' not found"
    exit 1
fi

echo "Generating icons from: $LOGO"
echo ""

# PWA Icons (public/)
echo "Creating PWA icons..."
magick "$LOGO" -resize 48x48 public/icon-48.png
magick "$LOGO" -resize 72x72 public/icon-72.png
magick "$LOGO" -resize 96x96 public/icon-96.png
magick "$LOGO" -resize 128x128 public/icon-128.png
magick "$LOGO" -resize 144x144 public/icon-144.png
magick "$LOGO" -resize 192x192 public/icon-192.png
magick "$LOGO" -resize 384x384 public/icon-384.png
magick "$LOGO" -resize 512x512 public/icon-512.png
magick "$LOGO" -resize 180x180 public/apple-touch-icon.png

echo "  Created 9 PWA icons in public/"

# Android Icons
echo "Creating Android icons..."

# Standard launcher icons
magick "$LOGO" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
magick "$LOGO" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
magick "$LOGO" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
magick "$LOGO" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
magick "$LOGO" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Round launcher icons (circular mask)
magick "$LOGO" -resize 48x48 \( +clone -threshold -1 -negate -fill white -draw "circle 24,24 24,0" \) -alpha off -compose copy_opacity -composite android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
magick "$LOGO" -resize 72x72 \( +clone -threshold -1 -negate -fill white -draw "circle 36,36 36,0" \) -alpha off -compose copy_opacity -composite android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
magick "$LOGO" -resize 96x96 \( +clone -threshold -1 -negate -fill white -draw "circle 48,48 48,0" \) -alpha off -compose copy_opacity -composite android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
magick "$LOGO" -resize 144x144 \( +clone -threshold -1 -negate -fill white -draw "circle 72,72 72,0" \) -alpha off -compose copy_opacity -composite android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
magick "$LOGO" -resize 192x192 \( +clone -threshold -1 -negate -fill white -draw "circle 96,96 96,0" \) -alpha off -compose copy_opacity -composite android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# Foreground icons for adaptive icons (slightly larger, centered)
magick "$LOGO" -resize 72x72 -gravity center -background none -extent 108x108 android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
magick "$LOGO" -resize 108x108 -gravity center -background none -extent 162x162 android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
magick "$LOGO" -resize 144x144 -gravity center -background none -extent 216x216 android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
magick "$LOGO" -resize 216x216 -gravity center -background none -extent 324x324 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
magick "$LOGO" -resize 288x288 -gravity center -background none -extent 432x432 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png

echo "  Created 15 Android icons in android/app/src/main/res/"

echo ""
echo "Done! All icons generated successfully."
echo ""
echo "Next steps:"
echo "  1. Run 'npm run build' to rebuild the PWA"
echo "  2. Run 'npx cap sync' to sync Android assets"
echo "  3. Rebuild your Android APK"
