import type { APIRoute } from 'astro'
import { getRooms } from '../../lib/notion'

export const GET: APIRoute = async () => {
  try {
    const rooms = await getRooms()
    return new Response(JSON.stringify(rooms), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch rooms' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
