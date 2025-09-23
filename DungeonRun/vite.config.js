import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.glb', '**/*.jpg'], // Include .glb and .jpg files
  server: {
    fs: {
      allow: ['.'] // Allow access to all files in project root
    }
  }
});