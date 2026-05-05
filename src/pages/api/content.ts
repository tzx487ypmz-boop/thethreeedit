import type { APIRoute } from 'astro'
import { getContent } from '../../lib/notion'

export const GET: APIRoute = async () => {
  try {
    const content = await getContent()
    return new Response(JSON.stringify(content), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
