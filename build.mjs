import { cp, mkdir, readdir, copyFile, rm } from 'node:fs/promises';

const output = new URL('./dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of await readdir(new URL('.', import.meta.url), { withFileTypes: true })) {
  if (entry.isFile() && /\.(?:html|css|js)$/.test(entry.name)) {
    await copyFile(new URL(entry.name, import.meta.url), new URL(entry.name, output));
  }
}
await copyFile(new URL('./CNAME', import.meta.url), new URL('./CNAME', output));
await cp(new URL('./assets/', import.meta.url), new URL('./assets/', output), { recursive: true });
