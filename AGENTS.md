<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Website sync workflow (all tools: Claude Code, VS Code, Antigravity agents)

This folder (`D:\Projects\2.Website`) is the single source of truth for the live website. It deploys from the `main` branch of `github.com/Abhi99ram/InvestIQ`. Work may be done from different editors/agents, so every session must follow these steps:

1. **Before starting any work:** run `git pull origin main` so you build on the latest changes made from any other tool.
2. **After finishing a change:** run `npm run build` and fix any errors. Never push a broken build.
3. **Then publish:** `git add -A`, `git commit -m "<clear description>"`, `git push origin main`. Pushing to `main` updates the live website.
4. Never leave finished work uncommitted or unpushed at the end of a session.
5. Never commit `.env*` files or secrets.
