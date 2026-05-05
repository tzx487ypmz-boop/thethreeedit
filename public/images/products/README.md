# Product Images

Place one image per product here, all in square format.

## Naming

Use the product's ID as the filename — matching exactly what you use in `data/products.json`.

Examples:
```
linen-throw.jpg
ceramic-mug.jpg
woven-basket.jpg
linen-napkins.jpg
wooden-tray.jpg
bud-vase.jpg
```

## Image specifications

- **Size:** 800 × 800px (minimum), 1200 × 1200px (ideal)
- **Aspect ratio:** 1:1 (square — this is important, all product cards are square)
- **Background:** clean and neutral — white, off-white, or a styled surface
- **Format:** JPG or WebP
- **File size:** aim for under 250KB

## Style guidance

Product images should feel:
- Calm and considered — no busy backgrounds
- Softly lit, natural light preferred
- Either flat lay (overhead) or a simple lifestyle context
- Consistent across all products (similar light and background tone)

## How to reference in data

In `data/products.json`, set the `image` field to:

```json
"image": "/images/products/linen-throw.jpg"
```
