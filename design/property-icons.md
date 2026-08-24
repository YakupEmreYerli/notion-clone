# Property icon source

Database property icons use `lucide-react`, already installed in this project.

- Source: https://lucide.dev/
- Repository: https://github.com/lucide-icons/lucide
- License: ISC (`node_modules/lucide-react/LICENSE`)
- Persisted value: stable application icon ID, never SVG markup

Notion currently serves its own property glyphs from URLs such as
`/icons/description_gray.svg?mode=light`. Those proprietary assets are not
copied or hot-linked. The picker uses a curated Lucide catalog with equivalent
semantic coverage and direct imports so the full 2,000+ icon package is not
shipped to the client.
