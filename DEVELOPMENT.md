# Local Development

Quick setup for running Rackitect on your machine.

```bash
git clone https://github.com/lucacri/Rackitect.git
cd Rackitect
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173/`.

## Production Build

```bash
npm run build
npm run preview
```

`npm run build` writes the production output to `dist/`. `npm run preview` serves that built output locally.
