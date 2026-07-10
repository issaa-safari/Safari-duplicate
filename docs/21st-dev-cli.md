# 21st.dev CLI setup

The [21st.dev](https://21st.dev) CLI is used in this project to search, install, and publish UI components (it works well with our shadcn-style `components/ui` setup). This doc covers install, auth, everyday commands, and CI usage.

## Install & sign in

```bash
npm i -g @21st-dev/cli
21st login   # opens the browser and saves a token locally
```

Verify with:

```bash
21st whoami
21st usage   # account tier + remaining free quota
```

## Everyday usage

```bash
# Search components, themes, and templates
21st search "pricing table"

# Install a component from the registry (lands in components/ per shadcn conventions)
21st add shadcn/button

# Publish a component to your team library
21st publish ./PinList.tsx --description "A pinned items list"

# Manage a published item
21st edit pin-list --type component --visibility public
21st delete pin-list --type component --yes
```

Run `21st help` for the full command list (bookmarks, teams, themes, AI sketch generation, logo search, and more).

## CI / scripts (no browser login)

Skip `21st login` and authenticate with an API key instead — get one at <https://21st.dev/mcp>:

```bash
# either pass it per command…
21st search "pricing table" --api-key "$API_KEY_21ST"

# …or set the env var once (TWENTYFIRST_TOKEN also works)
export API_KEY_21ST=...
21st add shadcn/button
```

`API_KEY_21ST` is listed in `.env.example`; keep real keys out of the repo.

## MCP server (Claude Code)

`.mcp.json` includes the `21st` MCP server (added via `21st init --client claude --write`). It authenticates with the `API_KEY_21ST` environment variable, so set that in your shell (or Claude Code environment settings) and restart Claude for the server's tools to load.

## Notes for remote/sandboxed sessions

`21st login` needs a browser, so in headless environments (CI, Claude Code on the web) always use the API key path above. Also note that restrictive network policies must allow `21st.dev` for the CLI and MCP server to reach the registry.
