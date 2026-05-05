require('dotenv').config();
const express = require('express');
const { Client } = require('@notionhq/client');
const path = require('path');

const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PORT = process.env.PORT || 3000;

// 60-second in-memory cache (Notion file URLs expire after 1hr, so fresh fetches are safe)
const cache = new Map();
const CACHE_TTL = 60_000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Property helpers — handle missing props gracefully
function titleText(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title');
  return prop ? prop.title.map(t => t.plain_text).join('') : '';
}

function richText(prop) {
  return prop?.rich_text?.map(t => t.plain_text).join('') ?? '';
}

function multiSelect(prop) {
  return prop?.multi_select?.map(o => o.name) ?? [];
}

function fileUrls(prop) {
  return (prop?.files ?? [])
    .map(f => (f.type === 'external' ? f.external.url : f.file?.url))
    .filter(Boolean);
}

function urlVal(prop) {
  return prop?.url ?? '';
}

function relationIds(prop) {
  return (prop?.relation ?? []).map(r => r.id);
}

// Block helpers for wiki page parsing
function blockText(block) {
  const inner = block[block.type];
  if (!inner) return '';
  if (Array.isArray(inner.rich_text)) return inner.rich_text.map(t => t.plain_text).join('');
  return '';
}

function imageBlockUrl(block) {
  if (block.type !== 'image') return '';
  const img = block.image;
  return img.type === 'external' ? img.external.url : img.file?.url ?? '';
}

// Strip "Label: " prefix from strings like "Headline: Shop the feeling..."
function stripLabel(text) {
  const colonIdx = text.indexOf(': ');
  return (colonIdx > 0 && colonIdx < 20) ? text.slice(colonIdx + 2) : text;
}

function labelKey(text) {
  const colonIdx = text.indexOf(':');
  return (colonIdx > 0 && colonIdx < 20) ? text.slice(0, colonIdx).toLowerCase().trim() : '';
}

function parseHomepage(blocks) {
  const r = {
    heroHeadline: '', heroSubhead: '', heroImage: '',
    howWeWorkTitle: '', howWeWorkSteps: [],
    roomsTitle: '', roomsDescription: '',
    productsTitle: '', productsDescription: '',
    instagramHandle: '', instagramTitle: '', instagramDescription: '',
    footerTagline: '',
  };

  let section = '';

  for (const b of blocks) {
    const type = b.type;
    const text = blockText(b).trim();

    if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
      const lower = text.toLowerCase();
      if (lower.includes('hero')) section = 'hero';
      else if (lower.includes('how we work') || lower.includes('how we curate')) section = 'howwework';
      else if (lower.includes('step') || lower.includes('edit, in') || lower.includes('three step')) {
        r.howWeWorkTitle = text;
        section = 'steps';
      }
      else if (lower.includes('rooms section') || lower.includes('room intro')) section = 'rooms';
      else if (lower.includes('products section') || lower.includes('product intro')) section = 'products';
      else if (lower.includes('instagram')) section = 'instagram';
      else if (lower.includes('footer')) section = 'footer';
      continue;
    }

    if (type === 'image') {
      if (section === 'hero') r.heroImage = imageBlockUrl(b);
      continue;
    }

    if (!text) continue;

    const key = labelKey(text);
    const val = stripLabel(text);

    if (type === 'paragraph') {
      if (section === 'hero') {
        if (key === 'headline') r.heroHeadline = val;
        else if (key === 'subhead') r.heroSubhead = val;
      } else if (section === 'rooms') {
        if (key === 'title') r.roomsTitle = val;
        else if (key === 'description') r.roomsDescription = val;
      } else if (section === 'products') {
        if (key === 'title') r.productsTitle = val;
        else if (key === 'description') r.productsDescription = val;
      } else if (section === 'instagram') {
        if (key === 'title') r.instagramTitle = val;
        else if (key === 'description') r.instagramDescription = val;
        else if (key === 'handle') r.instagramHandle = val;
      } else if (section === 'footer') {
        if (!r.footerTagline) r.footerTagline = text; // first paragraph only
      }
    } else if (type === 'numbered_list_item' && section === 'steps') {
      r.howWeWorkSteps.push(text);
    }
  }

  return r;
}

function parseAbout(blocks) {
  const r = {
    image: '',
    paragraphs: [],
    ikigai: { love: '', skill: '', value: '', bridge: '' },
  };

  let inIkigai = false;

  for (const b of blocks) {
    const type = b.type;
    const text = blockText(b).trim();

    if (type === 'image') {
      r.image = imageBlockUrl(b);
      continue;
    }

    if (type === 'heading_3' && text.toLowerCase().includes('ikigai')) {
      inIkigai = true;
      continue;
    }

    if (type === 'paragraph' && !inIkigai && text) {
      r.paragraphs.push(text);
    }

    if (type === 'bulleted_list_item' && inIkigai && text) {
      const key = labelKey(text);
      const val = stripLabel(text);
      if (r.ikigai[key] !== undefined) r.ikigai[key] = val;
    }
  }

  return r;
}

async function getContent() {
  const hit = getCached('content');
  if (hit) return hit;

  const [hpBlocks, abBlocks] = await Promise.all([
    notion.blocks.children.list({ block_id: process.env.NOTION_HOMEPAGE_ID, page_size: 100 }),
    notion.blocks.children.list({ block_id: process.env.NOTION_ABOUT_ID, page_size: 100 }),
  ]);

  const content = {
    homepage: parseHomepage(hpBlocks.results),
    about: parseAbout(abBlocks.results),
  };

  setCached('content', content);
  return content;
}

// Fetch all pages from a database, following pagination
async function fetchAll(dbId) {
  const results = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function getRooms() {
  const hit = getCached('rooms');
  if (hit) return hit;

  const pages = await fetchAll(process.env.NOTION_ROOMS_DB);
  const rooms = pages
    .filter(p => p.object === 'page' && !p.archived)
    .map(page => {
      const title = titleText(page);
      const props = page.properties;
      return {
        id: page.id,
        slug: slugify(title),
        title,
        description: richText(props.Description),
        images: fileUrls(props.Images),
        style: multiSelect(props.Style),
        altText: richText(props['Image Description (SEO)']) || title,
      };
    })
    .filter(r => r.title);

  setCached('rooms', rooms);
  return rooms;
}

async function getProducts() {
  const hit = getCached('products');
  if (hit) return hit;

  const pages = await fetchAll(process.env.NOTION_PRODUCTS_DB);
  const products = pages
    .filter(p => p.object === 'page' && !p.archived)
    .map(page => {
      const title = titleText(page);
      const props = page.properties;
      const images = fileUrls(props.Images);
      return {
        id: page.id,
        slug: slugify(title),
        title,
        description: richText(props.Description),
        image: images[0] ?? '',
        images,
        link: urlVal(props.Link),
        style: multiSelect(props.Style),
        color: multiSelect(props.Color),
        type: multiSelect(props.Type),
        roomIds: relationIds(props.Rooms),
        altText: richText(props['Image Description (SEO)']) || title,
      };
    })
    .filter(p => p.title);

  setCached('products', products);
  return products;
}

// API routes
app.get('/api/rooms', async (_req, res) => {
  try {
    res.json(await getRooms());
  } catch (err) {
    console.error('Rooms fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    res.json(await getProducts());
  } catch (err) {
    console.error('Products fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/content', async (_req, res) => {
  try {
    res.json(await getContent());
  } catch (err) {
    console.error('Content fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

async function getText() {
  const hit = getCached('text');
  if (hit) return hit;

  const pages = await fetchAll(process.env.NOTION_SITE_TEXT_DB);
  const result = {};

  pages
    .filter(p => p.object === 'page' && !p.archived)
    .forEach(page => {
      const key = titleText(page);
      if (!key) return;
      const props = page.properties;
      const media = fileUrls(props['Files & media']);
      result[key] = {
        text: richText(props['Site Text']),
        seoDescription: richText(props['Description (SEO)']),
        mediaUrl: media[0] ?? '',
      };
    });

  setCached('text', result);
  return result;
}

app.get('/api/text', async (_req, res) => {
  try {
    res.json(await getText());
  } catch (err) {
    console.error('Text fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch site text. Share NOTION_SITE_TEXT_DB with the integration.' });
  }
});

// Dynamic room + product pages — must come before static middleware
app.get(['/rooms/:slug', '/rooms/:slug/'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'rooms', 'room.html'));
});

app.get(['/products/:slug', '/products/:slug/'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'products', 'product.html'));
});

// Static files (HTML, CSS, JS, images)
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`The Three Edit → http://localhost:${PORT}`));
