import type { APIRoute } from 'astro'
import { getProducts } from '../../lib/notion'

export const GET: APIRoute = async () => {
  try {
    const products = await getProducts()
    return new Response(JSON.stringify(products), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
