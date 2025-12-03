// Post-build fixer to normalize import specifiers:
// - In emitted .js files (dist): ensure all relative imports use a .js suffix
// - In emitted .d.ts files: ensure all relative imports use a .ts suffix (replace .js -> .ts)
// This helps consumers under ESM and keeps declaration paths pointing to TS sources.

import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

const root = process.cwd();
const distDir = resolve(root, 'dist');

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function isRelative(spec) {
  return spec.startsWith('./') || spec.startsWith('../');
}

function toPosixPath(p) {
  return p.split('\\').join('/');
}

function ensureJsSpecifier(spec, fileDir) {
  // Only modify relative specifiers
  if (!isRelative(spec)) return spec;
  // If already .js, keep
  if (spec.endsWith('.js')) return spec;
  // If explicitly .ts, convert to .js for runtime
  if (spec.endsWith('.ts')) return spec.slice(0, -3) + '.js';

  // Try resolve to existing file in dist
  const onDiskBase = resolve(fileDir, spec);
  if (existsSync(onDiskBase + '.js')) {
    return spec + '.js';
  }
  if (existsSync(resolve(onDiskBase, 'index.js'))) {
    // Ensure we add /index.js using POSIX separators for import specifiers
      return toPosixPath(join(spec, 'index.js'));
  }
  // Fallback: append .js
  return spec + '.js';
}

function ensureTsSpecifier(spec) {
  if (!isRelative(spec)) return spec;
  if (spec.endsWith('.ts')) return spec;
  if (spec.endsWith('.js')) return spec.slice(0, -3) + '.ts';
  // If no extension provided, leave as-is to avoid pointing to non-existent TS path
  return spec;
}

function replaceSpecifiers(content, filePath, mode) {
  const fileDir = dirname(filePath);
  const mapper = mode === 'js' ? (s) => ensureJsSpecifier(s, fileDir) : ensureTsSpecifier;

  // from '...'
  content = content.replace(/(from\s+['"])([^'"\n]+)(['"])/g, (m, p1, spec, p3) => {
    const next = mapper(spec);
    return p1 + next + p3;
  });

  // import '...'; (side-effect imports)
  content = content.replace(/(import\s+['"])([^'"\n]+)(['"];?)/g, (m, p1, spec, p3) => {
    const next = mapper(spec);
    return p1 + next + p3;
  });

  // dynamic import('...')
  content = content.replace(/(import\s*\(\s*['"])([^'"\n]+)(['"]\s*\))/g, (m, p1, spec, p3) => {
    const next = mapper(spec);
    return p1 + next + p3;
  });

  return content;
}

function processFile(file) {
  const isJs = file.endsWith('.js');
  const isDts = file.endsWith('.d.ts');
  if (!isJs && !isDts) return;
  const original = readFileSync(file, 'utf8');
  const mode = isJs ? 'js' : 'ts';
  const updated = replaceSpecifiers(original, file, mode);
  if (updated !== original) {
    writeFileSync(file, updated, 'utf8');
  }
}

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  process.exit(0);
}

const files = walk(distDir);
for (const f of files) processFile(f);
