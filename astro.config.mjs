import { defineConfig } from 'astro/config';

// Static build. Every route is baked at build time — there is no server.
// Anything that must be correct on the day (live mode) is computed client-side.
export default defineConfig({
  site: 'https://dilsejashann.com',
  output: 'static',
});
