import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const potrace = require('potrace');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE_CANDIDATES = [
  'public/avatar-source.png',
  'public/avatar-source.jpg',
  'public/avatar-source.jpeg',
  'public/avatar-source.webp',
  'src/assets/project-avatar.png',
  'src/assets/project-avatar.jpg',
  'src/assets/project-avatar.jpeg',
  'src/assets/project-avatar.webp',
].map(filePath => path.join(rootDir, filePath));

const OUTPUT_FILES = [
  path.join(rootDir, 'public/avatar.svg'),
  path.join(rootDir, 'public/favicon.svg'),
];

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getSourceAvatarPath() {
  for (const candidate of SOURCE_CANDIDATES) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function posterize(sourcePath) {
  return new Promise((resolve, reject) => {
    potrace.posterize(
      sourcePath,
      {
        steps: 6,
        threshold: potrace.THRESHOLD_AUTO,
        background: 'transparent',
      },
      (error, svg) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(svg);
      }
    );
  });
}

function trace(sourcePath) {
  return new Promise((resolve, reject) => {
    potrace.trace(
      sourcePath,
      {
        color: '#145f58',
        background: 'transparent',
      },
      (error, svg) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(svg);
      }
    );
  });
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeOutputs(svg) {
  for (const outputFile of OUTPUT_FILES) {
    await ensureDir(outputFile);
    await writeFile(outputFile, svg, 'utf8');
  }
}

async function run() {
  const sourcePath = process.env.AVATAR_SOURCE
    ? path.resolve(rootDir, process.env.AVATAR_SOURCE)
    : await getSourceAvatarPath();

  if (!sourcePath || !(await fileExists(sourcePath))) {
    console.warn(
      '[avatar:svg] Source avatar not found. Add one of: public/avatar-source.(png|jpg|jpeg|webp) or src/assets/project-avatar.(png|jpg|jpeg|webp)'
    );
    return;
  }

  try {
    const svg = await posterize(sourcePath);
    await writeOutputs(svg);
    console.log(`[avatar:svg] Generated SVG from ${path.relative(rootDir, sourcePath)}`);
  } catch (posterizeError) {
    const svg = await trace(sourcePath);
    await writeOutputs(svg);
    console.log(
      `[avatar:svg] Posterize failed, used trace fallback for ${path.relative(rootDir, sourcePath)}`
    );
    if (posterizeError instanceof Error) {
      console.warn(`[avatar:svg] Posterize error: ${posterizeError.message}`);
    }
  }
}

run().catch(error => {
  console.error('[avatar:svg] Failed to generate SVG:', error);
  process.exitCode = 1;
});
