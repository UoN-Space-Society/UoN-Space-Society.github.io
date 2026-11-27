import { mkdir, cp, copyFile, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of [
  'index.html',
  'sponsors.html',
  'contact.html',
  'projects.html',
  'style.css',
  'script.js',
])
  await copyFile(file, `dist/${file}`);
await cp('projects', 'dist/projects', { recursive: true });
await cp('assets', 'dist/assets', {
  recursive: true,
  filter: (source) => !source.endsWith('/sources.json'),
});
console.log('Static site built in dist/');
