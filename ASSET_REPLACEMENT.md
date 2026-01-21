# Asset Replacement Guide

This guide explains how to replace the placeholder icons and sounds with your own assets.

## App Icons

The app uses three icon files located in `/public/`:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192x192 px | Android home screen, PWA install |
| `icon-512.png` | 512x512 px | Android splash screen, PWA install |
| `apple-touch-icon.png` | 180x180 px | iOS home screen |

### How to Replace Icons

1. Create your icon design at 512x512 pixels (PNG format recommended)
2. Ensure the design works well as a circle (for Android adaptive icons)
3. Export at three sizes:
   - 512x512 as `icon-512.png`
   - 192x192 as `icon-192.png`
   - 180x180 as `apple-touch-icon.png`
4. Replace the files in the `/public/` folder
5. Rebuild the app: `npm run build`

### Icon Design Tips

- Keep important content within the center 70% (safe zone for adaptive icons)
- Use a simple, recognizable design
- Test on both light and dark backgrounds
- Consider using a tool like [Maskable.app](https://maskable.app/) to preview adaptive icons

---

## Sound Files

Sound files are located in `/public/sounds/`:

### Bell/Notification Sounds (Short)

| File | Duration | Description |
|------|----------|-------------|
| `bell.mp3` | ~3 seconds | Tibetan singing bowl - session start/interval |
| `gong.mp3` | ~3 seconds | Deep gong sound - session end |
| `singing-bowl.mp3` | ~3 seconds | Singing bowl resonance |
| `chime.mp3` | ~2 seconds | Light chime - intervals |

### Background/Ambient Sounds (Looping)

| File | Duration | Description |
|------|----------|-------------|
| `waterfall.mp3` | ~30 seconds | Waterfall ambient - should loop seamlessly |
| `rain.mp3` | ~30 seconds | Rain ambient - should loop seamlessly |

### How to Replace Sounds

1. **Format**: Use MP3 format (best compatibility) or OGG (smaller files)
2. **Quality**: 128-192 kbps is sufficient for meditation sounds
3. **Bell sounds**: Keep under 5 seconds, include natural fade-out
4. **Background sounds**:
   - Aim for 30-60 seconds
   - Ensure seamless looping (start and end should blend)
   - Normalize volume to prevent sudden loud/quiet sections

### Replacing a Sound

1. Name your file exactly as the original (e.g., `bell.mp3`)
2. Place it in `/public/sounds/`
3. The app will automatically use the new sound

### Creating Seamless Loops

For background sounds like rain or waterfall:

1. Use audio software like Audacity (free)
2. Select a clean section of the audio
3. Use crossfade at the loop point to eliminate clicks
4. Test the loop by playing it on repeat

### Sound Sources

Here are some free sources for meditation sounds:

- [Freesound.org](https://freesound.org/) - Large library of free sounds
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/) - High-quality sound effects
- [Zapsplat](https://www.zapsplat.com/) - Free sound effects
- [YouTube Audio Library](https://studio.youtube.com/channel/audio) - Royalty-free music

**Note**: Always check the license before using sounds commercially.

---

## Custom User Sounds

Users can upload their own sounds through the app's Timer Setup screen. These are stored in the browser's localStorage as base64-encoded data.

**Limitations**:
- Maximum file size: 5MB per sound
- Supported formats: MP3, WAV, OGG
- Storage limit: ~5-10MB total (varies by browser)

---

## After Replacing Assets

1. Clear your browser cache
2. If testing PWA, uninstall and reinstall the app
3. Run `npm run build` before deploying

For development, changes should appear after refreshing the page.
