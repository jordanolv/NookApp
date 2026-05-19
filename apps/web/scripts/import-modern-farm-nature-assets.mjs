import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../../..');
const sourceRoot = path.join(repoRoot, 'assets-source/new/Modern_Farm_v1.2/16x16');
const natureDest = path.join(repoRoot, 'apps/web/public/assets/build/decor/nature');

const PREFIX = 'modern_farm_';

const sheets = [
  {
    prefix: 'modern_farm_fruit_tree',
    file: path.join(sourceRoot, '5_Fruit_Trees.png'),
    minArea: 90,
    maxArea: 9000,
    reject: ({ w, h }) => w < 12 || h < 12,
  },
  {
    prefix: 'modern_farm_tree',
    file: path.join(sourceRoot, '6_Trees_16x16.png'),
    minArea: 100,
    maxArea: 12000,
    reject: ({ w, h, y }) => y > 440 || w < 12 || h < 12,
  },
];

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

await mkdir(natureDest, { recursive: true });

const existing = await readdir(natureDest);
await Promise.all(
  existing.filter((file) => file.startsWith(PREFIX)).map((file) => rm(path.join(natureDest, file))),
);

let count = 0;
for (const sheet of sheets) {
  const boxes = componentBoxes(sheet.file).filter((box) => {
    if (box.area < sheet.minArea || box.area > sheet.maxArea) return false;
    return !sheet.reject?.(box);
  });

  boxes.forEach((box, index) => {
    cropComponent(
      sheet.file,
      box,
      path.join(natureDest, `${sheet.prefix}_${String(index + 1).padStart(3, '0')}.png`),
    );
    count += 1;
  });
}

console.log(`Imported ${count} modern farm nature assets.`);
