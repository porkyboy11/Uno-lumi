# UnoRouter Price Monitor for Lumiverse

A frontend-only Lumiverse Spindle extension that displays UnoRouter's public model catalogue inside a dedicated **Prices** drawer tab.

## Features
- Live model catalogue from `https://api.unorouter.com/api/pricing/catalog`
- Input/output prices in USD per 1M tokens
- Free/paid and online/offline indicators
- Search by model/provider
- Watchlist saved in this browser profile
- Manual refresh and automatic refresh every 5 minutes
- No UnoRouter API key or access token required

## Install
1. Open Lumiverse → Settings → Extensions.
2. Install this extension using the Spindle extension install flow.
3. If installing from a Git repository, publish this folder as a GitHub repository and install its repository URL.
4. Open the **Prices** drawer tab.

The manifest's `github` field is a placeholder (`https://github.com/`). Replace it with the URL of the repository you publish before distributing/installing from GitHub.

## Notes
- This uses only the public catalogue endpoint; it does not access account balance, usage logs, or credentials.
- If the browser blocks the cross-origin request, the panel will show an error. In that case, the extension can be adapted to use Lumiverse's permission-gated CORS proxy.
- Watchlist is stored locally in the Lumiverse browser origin under a namespaced localStorage key.
