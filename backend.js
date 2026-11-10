// UnoRouter Price Monitor — Lumiverse Spindle backend
// Fetches the public pricing catalogue server-side to avoid browser CORS restrictions.

spindle.onFrontendMessage(async (payload, userId) => {
  if (!payload || payload.type !== 'fetch_catalog' || !payload.requestId) return

  try {
    const response = await spindle.cors('https://api.unorouter.com/api/pricing/catalog', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`UnoRouter returned HTTP ${response.status} ${response.statusText || ''}`.trim())
    }

    let data
    try {
      data = JSON.parse(response.body)
    } catch {
      throw new Error('UnoRouter returned an unreadable response instead of JSON.')
    }

    if (!data || !Array.isArray(data.models)) {
      throw new Error('UnoRouter response did not contain a models catalogue.')
    }

    spindle.sendToFrontend({
      type: 'catalog_result',
      requestId: payload.requestId,
      data,
    }, userId)
  } catch (err) {
    spindle.sendToFrontend({
      type: 'catalog_result',
      requestId: payload.requestId,
      error: err && err.message ? err.message : String(err),
    }, userId)
  }
})

spindle.log.info('UnoRouter Price Monitor backend loaded')
