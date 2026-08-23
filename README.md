# Scotland Sectional Appendix

A searchable React/Vite reference for indexed pages of the Scotland Sectional Appendix.

## Run locally

Install a current LTS release of [Node.js](https://nodejs.org/), then from the project directory run:

```bash
npm install
npm run dev
```

Vite will print the local address, normally `http://127.0.0.1:5173/`.

## Production build

Create an optimised production build with:

```bash
npm run build
```

Preview that build locally with:

```bash
npm run preview
```

## URLs

- `/` — search page
- `/scotland` — indexed Scotland LOR collections
- `/scotland/SC001` — all indexed sequences for an LOR
- `/scotland/SC001/001` — one sequence entry

When deploying to a static host, configure an SPA fallback so these paths serve `index.html`.
