# Fold Lamp

A demonstration page for a fictional desk lamp — one product page, not a store. There is no cart, no checkout, no database, and no backend. The contact form does not send anything; what you type stays in the browser until you reload the page. The shade color changes only when the cord is pulled.

Live demo: https://lamp.iquee.tech

## Tech Stack

- [Vite](https://vite.dev/)
- [React](https://react.dev/)
- [React Three Fiber](https://r3f.docs.pmnd.rs/) (`@react-three/fiber`)
- [drei](https://drei.docs.pmnd.rs/) (`@react-three/drei`)
- [Three.js](https://threejs.org/) (`three`)

Shade finishes cycle by pulling the cord on the 3D model. There are no color buttons and no shopping flows.

## Model

The single 3D model is `public/fold-lamp.glb`, with meshes named `shade`, `bulb`, and `base`. Regenerate it with `npm run model` (`scripts/make-lamp.mjs`).

## Scripts

```bash
npm install
npm run model   # rewrites public/fold-lamp.glb
npm run dev
npm run build
```
