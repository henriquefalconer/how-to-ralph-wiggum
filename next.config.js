/** @type {import('next').NextConfig} */
// No `output: "standalone"` — that mode exists to produce a self-contained
// .next/standalone/server.js for container images. Render builds from source and
// starts the app with `npm start` (`next start`), which serves the normal .next
// build directly and does not use the standalone bundle.
const nextConfig = {};

module.exports = nextConfig;
