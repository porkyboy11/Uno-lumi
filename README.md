# UnoRouter Price Monitor v1.2.0

Lumiverse Spindle extension for monitoring UnoRouter model prices.

## Features
- Live UnoRouter catalogue with input/output USD prices per 1M tokens.
- Pin favourite models with the star button; pinned models stay at the top.
- View the currently active Lumiverse LLM connection and model.
- Automatically match the active model against the UnoRouter catalogue when its identifier is present.
- Search and filter models, manual refresh, and five-minute automatic refresh.
- Uses Lumiverse's backend CORS proxy; no UnoRouter API key is required.

## Install / update
Repository: https://github.com/porkyboy11/Uno-lumi

Update the installed extension from Lumiverse's Extensions panel so it pulls the latest repository commit. The extension needs the `cors_proxy` permission for catalogue requests.

The active connection panel uses Lumiverse's safe connection summary API. It does not read API keys, endpoint URLs, or other connection secrets. Pinned models are stored locally in the browser profile.
