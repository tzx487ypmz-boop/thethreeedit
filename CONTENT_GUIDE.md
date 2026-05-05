# Content Guide — The Three Edit

This guide explains how to add rooms and products to the site. No coding experience needed — just follow the steps below.

---

## Before you start

All content lives in two files:

- **`data/rooms.json`** — all the rooms
- **`data/products.json`** — all the products

These files are written in a format called JSON. It looks a little technical at first, but once you see the pattern, it's just filling in fields like a form. The most important rule: **every piece of text must be wrapped in double quotes**, and every item (except the last one in a list) must end with a comma.

---

## 1. How to add a new room

### Step 1 — Add your images

Inside the `images/rooms/` folder, create a new subfolder. Name it using the room's "slug" — a short, lowercase version of the room name with hyphens instead of spaces. For example:

- "The Linen Study" → `linen-study`
- "A Morning Nook" → `morning-nook`

Inside that folder, add:
- `cover.jpg` — the main image shown on the Rooms page (landscape, 4:3 ratio)
- `gallery-01.jpg`, `gallery-02.jpg` — additional images shown on the room's detail page

See `images/rooms/README.md` for exact size guidance.

### Step 2 — Open `data/rooms.json`

You'll see a list of rooms that looks like this:

```json
[
  { ...first room... },
  { ...second room... }
]
```

Add a new entry to the list. Copy the example below and fill in your details.

### Example

```json
{
  "id": "linen-study",
  "title": "The Linen Study",
  "coverImage": "/images/rooms/linen-study/cover.jpg",
  "roomStory": "A room built around the pleasure of sitting still. Warm linen, low shelves, a single pendant light. The kind of space that asks nothing of you.",
  "gallery": [
    "/images/rooms/linen-study/cover.jpg",
    "/images/rooms/linen-study/gallery-01.jpg",
    "/images/rooms/linen-study/gallery-02.jpg"
  ],
  "productIds": ["linen-throw", "woven-basket"]
}
```

### Field guide

| Field | What it is |
|---|---|
| `id` | The slug — must match the folder name you created in Step 1 |
| `title` | The full room name, shown on the site |
| `coverImage` | Path to the cover image |
| `roomStory` | 2–3 sentence description of the room's feeling |
| `gallery` | List of all image paths to show in the room gallery |
| `productIds` | IDs of products to show below the gallery (see section 3) |

### Step 3 — Create the room detail page

Duplicate the folder `rooms/reading-corner/` and rename the copy to match your room slug (e.g. `rooms/linen-study/`). Open the `index.html` inside it and change one line near the top:

```js
const ROOM_ID = 'linen-study';
```

That's it — the page will automatically load everything else from the JSON.

---

## 2. How to add a new product

### Step 1 — Add your image

Add the product image to `images/products/`. Name the file using the product's ID — a short, lowercase slug:

- "Rattan Side Table" → `rattan-side-table.jpg`

The image should be **square** (same width and height). See `images/products/README.md` for sizing details.

### Step 2 — Open `data/products.json`

Add a new entry to the list. Copy this example and fill in your details:

```json
{
  "id": "rattan-side-table",
  "title": "Rattan Side Table",
  "description": "A low, open-weave table in natural rattan. Light enough to move, interesting enough to stay.",
  "image": "/images/products/rattan-side-table.jpg",
  "style": ["warm", "textured"],
  "color": ["neutral"],
  "affiliateLink": "https://your-affiliate-link-here.com",
  "roomIds": ["reading-corner", "linen-study"]
}
```

### Field guide

| Field | What it is |
|---|---|
| `id` | The slug — must match the image filename (without the `.jpg`) |
| `title` | The product name shown on the site |
| `description` | A short, evocative description — 1–2 sentences |
| `image` | Path to the product image |
| `style` | Style tags for the filter (see allowed values below) |
| `color` | Colour tags for the filter (see allowed values below) |
| `affiliateLink` | The full URL the "shop the edit" button links to |
| `roomIds` | IDs of rooms this product belongs to (see section 3) |

### Style filter tags

A product can have **one or more** style tags. Use only these values:

- `"minimal"` — clean lines, simple forms, undecorated
- `"warm"` — tactile, inviting, natural materials
- `"textured"` — visible weave, grain, or surface interest

Example with multiple tags: `"style": ["warm", "textured"]`

### Colour filter tags

A product can have **one or more** colour tags. Use only these values:

- `"neutral"` — cream, oat, natural, undyed, white, beige
- `"terracotta"` — warm clay, rust, burnt orange, dusty red
- `"green"` — sage, moss, forest, olive

Example: `"color": ["neutral"]`

---

## 3. How to link a product to a room (and vice versa)

Products and rooms are linked to each other using their IDs. This works in both directions.

### On the product — `roomIds`

The `roomIds` field tells the site which rooms this product appears in:

```json
"roomIds": ["reading-corner", "morning-bedroom"]
```

This means the product will appear in the shopping list on both of those room detail pages.

### On the room — `productIds`

The `productIds` field on a room tells the site which products to show below that room's gallery:

```json
"productIds": ["linen-throw", "ceramic-mug", "woven-basket"]
```

**To link a product to a room, you need to update both files:**

1. Add the room's ID to the product's `roomIds` list in `data/products.json`
2. Add the product's ID to the room's `productIds` list in `data/rooms.json`

Both changes are needed for everything to appear correctly.

---

## Tips

- Always save your JSON files after editing and check them for missing commas or unclosed brackets — a small typo can break the page. You can paste the file contents into [jsonlint.com](https://jsonlint.com) to check for errors.
- The order items appear in the JSON is the order they'll appear on the site.
- Keep room stories short — 2–3 sentences. They're mood-setting, not descriptions.
- Keep product descriptions short too — 1–2 sentences, sensory and specific.
