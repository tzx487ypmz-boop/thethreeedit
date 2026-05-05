import type { APIRoute } from 'astro'
import { getText } from '../../lib/notion'

export const GET: APIRoute = async () => {
  try {
    const text = await getText()
    return new Response(JSON.stringify(text), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch site text' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
