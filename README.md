# UnoRouter Price Monitor v1.1

Full-stack Lumiverse Spindle extension.

Upload these files into the repository root, replacing the previous `spindle.json` and `frontend.js` and adding `backend.js`.

The frontend now requests the catalogue through Lumiverse's backend CORS proxy. Grant the extension its `cors_proxy` permission in the Extensions panel. No UnoRouter API credentials are used; the catalogue endpoint is public.

After committing, update/reinstall the extension in Lumiverse so it loads the new backend entry and permission.
