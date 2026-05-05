# Room Images

Each room gets its own subfolder inside this directory.

## Folder structure

```
images/rooms/
├── reading-corner/
│   ├── cover.jpg        ← main card image shown on the Rooms page
│   ├── gallery-01.jpg   ← first gallery image on the room detail page
│   ├── gallery-02.jpg
│   └── gallery-03.jpg
├── the-still-kitchen/
│   ├── cover.jpg
│   └── gallery-01.jpg
└── morning-bedroom/
    ├── cover.jpg
    └── gallery-01.jpg
```

## Cover image

Used as the card thumbnail on the Rooms listing page and as the first image in the room gallery.

- **Size:** 1200 × 900px (minimum)
- **Aspect ratio:** 4:3
- **Filename:** `cover.jpg`

## Gallery images

Shown in the scrolling gallery on the room's detail page. The first image spans full-width; the rest appear in a grid.

- **Size:** 1200 × 900px (minimum)
- **Aspect ratio:** 4:3 (all gallery images should match)
- **Filenames:** `gallery-01.jpg`, `gallery-02.jpg`, etc.
- **Format:** JPG or WebP
- **File size:** aim for under 400KB each

## Adding a new room

Create a new subfolder with the room's slug (the short ID you use in `data/rooms.json`), then add `cover.jpg` and any gallery images. See `CONTENT_GUIDE.md` in the project root for full instructions.
