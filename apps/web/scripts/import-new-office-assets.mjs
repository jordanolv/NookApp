import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../../..');
const sourceRoot = path.join(repoRoot, 'assets-source/new');
const officeDest = path.join(repoRoot, 'apps/web/public/assets/build/decor/office');

const GENERATED_PREFIXES = ['free_office_', 'office_assets_', 'pixelinterior_', 'pixeloffice_'];

const separatedPacks = [
  {
    prefix: 'office_assets',
    dir: path.join(sourceRoot, 'office_assets/separately_assets'),
    skip: new Set(['separately.png']),
  },
  {
    prefix: 'free_office',
    dir: path.join(sourceRoot, 'free-office-pixel-art/free-office-pixel-art'),
    only: new Set([
      'Chair.png',
      'PC1.png',
      'PC2.png',
      'Trash.png',
      'cabinet.png',
      'coffee-maker.png',
      'desk-with-pc.png',
      'desk.png',
      'office-partitions-1.png',
      'office-partitions-2.png',
      'plant.png',
      'printer.png',
      'sink.png',
      'stamping-table.png',
      'water-cooler.png',
      'writing-table.png',
    ]),
  },
];

const componentSheets = [
  {
    prefix: 'pixeloffice',
    file: path.join(sourceRoot, 'PixelOffice/PixelOfficeAssets.png'),
    minArea: 110,
    maxArea: 2200,
    reject: ({ w, h, x, y }) => y < 32 || (y > 100 && w <= 24 && h >= 20) || (x > 130 && y > 130),
  },
  {
    prefix: 'pixelinterior_cabinets',
    file: path.join(sourceRoot, 'pixelinterior_LRK_v1.1/cabinets_LRK.png'),
    minArea: 80,
    maxArea: 3200,
  },
  {
    prefix: 'pixelinterior_decorations',
    file: path.join(sourceRoot, 'pixelinterior_LRK_v1.1/decorations_LRK.png'),
    minArea: 80,
    maxArea: 2200,
  },
  {
    prefix: 'pixelinterior_kitchen',
    file: path.join(sourceRoot, 'pixelinterior_LRK_v1.1/kitchen_LRK.png'),
    minArea: 80,
    maxArea: 3600,
  },
  {
    prefix: 'pixelinterior_livingroom',
    file: path.join(sourceRoot, 'pixelinterior_LRK_v1.1/livingroom_LRK.png'),
    minArea: 70,
    maxArea: 3600,
  },
];

function slug(value) {
  return value
    .replace(/\.png$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function componentBoxes(file) {
  const out = execFileSync(
    'magick',
    [
      file,
      '-alpha',
      'extract',
      '-threshold',
      '0',
      '-define',
      'connected-components:verbose=true',
      '-connected-components',
      '8',
      'null:',
    ],
    { encoding: 'utf8' },
  );

  return out
    .split('\n')
    .map((line) => {
      const match = line.match(
        /^\s+\d+:\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+[\d.]+,[\d.]+\s+(\d+)\s+srgb\(255,255,255\)/,
      );
      if (!match) return null;
      const [, w, h, x, y, area] = match;
      return {
        w: Number(w),
        h: Number(h),
        x: Number(x),
        y: Number(y),
        area: Number(area),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

async function cleanPreviousImports() {
  const files = await readdir(officeDest);
  await Promise.all(
    files
      .filter((file) => GENERATED_PREFIXES.some((prefix) => file.startsWith(prefix)))
      .map((file) => rm(path.join(officeDest, file))),
  );
}

async function copySeparatedPacks() {
  let copied = 0;

  for (const pack of separatedPacks) {
    const files = (await readdir(pack.dir))
      .filter((file) => file.endsWith('.png'))
      .filter((file) => !pack.skip?.has(file))
      .filter((file) => !pack.only || pack.only.has(file))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      await copyFile(
        path.join(pack.dir, file),
        path.join(officeDest, `${pack.prefix}_${slug(file)}.png`),
      );
      copied += 1;
    }
  }

  return copied;
}

function cropComponent(source, box, dest) {
  execFileSync('magick', [
    source,
    '-crop',
    `${box.w}x${box.h}+${box.x}+${box.y}`,
    '+repage',
    '-trim',
    '+repage',
    dest,
  ]);
}

async function cropComponentSheets() {
  let cropped = 0;

  for (const sheet of componentSheets) {
    const boxes = componentBoxes(sheet.file).filter((box) => {
      if (box.area < sheet.minArea || box.area > sheet.maxArea) return false;
      if (box.w < 6 || box.h < 6) return false;
      return !sheet.reject?.(box);
    });

    boxes.forEach((box, index) => {
      cropComponent(
        sheet.file,
        box,
        path.join(officeDest, `${sheet.prefix}_${String(index + 1).padStart(3, '0')}.png`),
      );
      cropped += 1;
    });
  }

  return cropped;
}

await mkdir(officeDest, { recursive: true });
await cleanPreviousImports();
const copied = await copySeparatedPacks();
const cropped = await cropComponentSheets();

console.log(`Imported ${copied + cropped} office assets (${copied} copied, ${cropped} cropped).`);
