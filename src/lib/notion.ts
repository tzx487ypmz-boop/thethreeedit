import { Client } from '@notionhq/client'
import { getCached, setCached } from './cache'

const notion = new Client({ auth: import.meta.env.NOTION_TOKEN })

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string
  slug: string
  title: string
  description: string
  images: string[]
  style: string[]
  altText: string
}

export interface Product {
  id: string
  slug: string
  title: string
  description: string
  image: string
  images: string[]
  link: string
  style: string[]
  color: string[]
  type: string[]
  roomIds: string[]
  altText: string
}

export interface HomepageContent {
  heroHeadline: string
  heroSubhead: string
  heroImage: string
  howWeWorkTitle: string
  howWeWorkSteps: string[]
  roomsTitle: string
  roomsDescription: string
  productsTitle: string
  productsDescription: string
  instagramHandle: string
  instagramTitle: string
  instagramDescription: string
  footerTagline: string
}

export interface AboutContent {
  image: string
  paragraphs: string[]
  ikigai: { love: string; skill: string; value: string; bridge: string }
}

export interface ContentBlock {
  homepage: HomepageContent
  about: AboutContent
}

export interface TextEntry {
  text: string
  seoDescription: string
  mediaUrl: string
}

export type TextMap = Record<string, TextEntry>

// ─── Property helpers ─────────────────────────────────────────────────────────

function titleText(page: any): string {
  const prop = Object.values(page.properties as Record<string, any>).find(
    (p: any) => p.type === 'title'
  ) as any
  return prop ? prop.title.map((t: any) => t.plain_text).join('') : ''
}

function richText(prop: any): string {
  return prop?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''
}

function multiSelect(prop: any): string[] {
  return prop?.multi_select?.map((o: any) => o.name) ?? []
}

function fileUrls(prop: any): string[] {
  return (prop?.files ?? [])
    .map((f: any) => (f.type === 'external' ? f.external.url : f.file?.url))
    .filter(Boolean)
}

function urlVal(prop: any): string {
  return prop?.url ?? ''
}

function relationIds(prop: any): string[] {
  return (prop?.relation ?? []).map((r: any) => r.id)
}

function blockText(block: any): string {
  const inner = block[block.type]
  if (!inner) return ''
  if (Array.isArray(inner.rich_text)) return inner.rich_text.map((t: any) => t.plain_text).join('')
  return ''
}

function imageBlockUrl(block: any): string {
  if (block.type !== 'image') return ''
  const img = block.image
  return img.type === 'external' ? img.external.url : img.file?.url ?? ''
}

function stripLabel(text: string): string {
  const colonIdx = text.indexOf(': ')
  return colonIdx > 0 && colonIdx < 20 ? text.slice(colonIdx + 2) : text
}

function labelKey(text: string): string {
  const colonIdx = text.indexOf(':')
  return colonIdx > 0 && colonIdx < 20 ? text.slice(0, colonIdx).toLowerCase().trim() : ''
}

// ─── Pagination helper ────────────────────────────────────────────────────────

async function fetchAll(dbId: string): Promise<any[]> {
  const results: any[] = []
  let cursor: string | undefined
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size: 100,
    })
    results.push(...res.results)
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return results
}

// ─── Notion parsers ───────────────────────────────────────────────────────────

function parseHomepage(blocks: any[]): HomepageContent {
  const r: HomepageContent = {
    heroHeadline: '', heroSubhead: '', heroImage: '',
    howWeWorkTitle: '', howWeWorkSteps: [],
    roomsTitle: '', roomsDescription: '',
    productsTitle: '', productsDescription: '',
    instagramHandle: '', instagramTitle: '', instagramDescription: '',
    footerTagline: '',
  }
  let section = ''
  for (const b of blocks) {
    const type = b.type
    const text = blockText(b).trim()
    if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
      const lower = text.toLowerCase()
      if (lower.includes('hero')) section = 'hero'
      else if (lower.includes('how we work') || lower.includes('how we curate')) section = 'howwework'
      else if (lower.includes('step') || lower.includes('edit, in') || lower.includes('three step')) {
        r.howWeWorkTitle = text
        section = 'steps'
      } else if (lower.includes('rooms section') || lower.includes('room intro')) section = 'rooms'
      else if (lower.includes('products section') || lower.includes('product intro')) section = 'products'
      else if (lower.includes('instagram')) section = 'instagram'
      else if (lower.includes('footer')) section = 'footer'
      continue
    }
    if (type === 'image') {
      if (section === 'hero') r.heroImage = imageBlockUrl(b)
      continue
    }
    if (!text) continue
    const key = labelKey(text)
    const val = stripLabel(text)
    if (type === 'paragraph') {
      if (section === 'hero') {
        if (key === 'headline') r.heroHeadline = val
        else if (key === 'subhead') r.heroSubhead = val
      } else if (section === 'rooms') {
        if (key === 'title') r.roomsTitle = val
        else if (key === 'description') r.roomsDescription = val
      } else if (section === 'products') {
        if (key === 'title') r.productsTitle = val
        else if (key === 'description') r.productsDescription = val
      } else if (section === 'instagram') {
        if (key === 'title') r.instagramTitle = val
        else if (key === 'description') r.instagramDescription = val
        else if (key === 'handle') r.instagramHandle = val
      } else if (section === 'footer') {
        if (!r.footerTagline) r.footerTagline = text
      }
    } else if (type === 'numbered_list_item' && section === 'steps') {
      r.howWeWorkSteps.push(text)
    }
  }
  return r
}

function parseAbout(blocks: any[]): AboutContent {
  const r: AboutContent = {
    image: '',
    paragraphs: [],
    ikigai: { love: '', skill: '', value: '', bridge: '' },
  }
  let inIkigai = false
  for (const b of blocks) {
    const type = b.type
    const text = blockText(b).trim()
    if (type === 'image') { r.image = imageBlockUrl(b); continue }
    if (type === 'heading_3' && text.toLowerCase().includes('ikigai')) { inIkigai = true; continue }
    if (type === 'paragraph' && !inIkigai && text) r.paragraphs.push(text)
    if (type === 'bulleted_list_item' && inIkigai && text) {
      const key = labelKey(text) as keyof typeof r.ikigai
      const val = stripLabel(text)
      if (key in r.ikigai) r.ikigai[key] = val
    }
  }
  return r
}

// ─── Public API ───────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function getRooms(): Promise<Room[]> {
  const hit = getCached<Room[]>('rooms')
  if (hit) return hit
  const pages = await fetchAll(import.meta.env.NOTION_ROOMS_DB)
  const rooms = pages
    .filter((p: any) => p.object === 'page' && !p.archived)
    .map((page: any) => {
      const title = titleText(page)
      const props = page.properties
      return {
        id: page.id,
        slug: slugify(title),
        title,
        description: richText(props.Description),
        images: fileUrls(props.Images),
        style: multiSelect(props.Style),
        altText: richText(props['Image Description (SEO)']) || title,
      } satisfies Room
    })
    .filter((r: Room) => r.title)
  setCached('rooms', rooms)
  return rooms
}

export async function getProducts(): Promise<Product[]> {
  const hit = getCached<Product[]>('products')
  if (hit) return hit
  const pages = await fetchAll(import.meta.env.NOTION_PRODUCTS_DB)
  const products = pages
    .filter((p: any) => p.object === 'page' && !p.archived)
    .map((page: any) => {
      const title = titleText(page)
      const props = page.properties
      const images = fileUrls(props.Images)
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
      } satisfies Product
    })
    .filter((p: Product) => p.title)
  setCached('products', products)
  return products
}

export async function getContent(): Promise<ContentBlock> {
  const hit = getCached<ContentBlock>('content')
  if (hit) return hit
  const [hpBlocks, abBlocks] = await Promise.all([
    notion.blocks.children.list({ block_id: import.meta.env.NOTION_HOMEPAGE_ID, page_size: 100 }),
    notion.blocks.children.list({ block_id: import.meta.env.NOTION_ABOUT_ID, page_size: 100 }),
  ])
  const content: ContentBlock = {
    homepage: parseHomepage(hpBlocks.results),
    about: parseAbout(abBlocks.results),
  }
  setCached('content', content)
  return content
}

export async function getText(): Promise<TextMap> {
  const hit = getCached<TextMap>('text')
  if (hit) return hit
  const pages = await fetchAll(import.meta.env.NOTION_SITE_TEXT_DB)
  const result: TextMap = {}
  pages
    .filter((p: any) => p.object === 'page' && !p.archived)
    .forEach((page: any) => {
      const key = titleText(page)
      if (!key) return
      const props = page.properties
      const media = fileUrls(props['Files & media'])
      result[key] = {
        text: richText(props['Site Text']),
        seoDescription: richText(props['Description (SEO)']),
        mediaUrl: media[0] ?? '',
      }
    })
  setCached('text', result)
  return result
}
