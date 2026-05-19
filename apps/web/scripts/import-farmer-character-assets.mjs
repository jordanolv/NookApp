import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../../..');
const sourceRoot = path.join(
  repoRoot,
  'assets-source/new/Farmer Generator Linux Build/Character Pieces',
);
const cgRoot = path.join(repoRoot, 'apps/web/public/assets/cg');

const imports = [
  ...Array.from({ length: 9 }, (_, index) => ({
    layer: 'body',
    id: `farmer_body_${String(index + 1).padStart(2, '0')}`,
    file: `Bodies/16x16/Body_${index + 1}.png`,
  })),
  ...['Blue', 'Brown', 'Gray', 'Green', 'Orange'].map((color) => ({
    layer: 'eyes',
    id: `farmer_eyes_${color.toLowerCase()}`,
    file: `Eyes/16x16/Eyes_${color}.png`,
  })),
  ...[
    'Braces_Brown',
    'Braces_Green',
    'Braces_Orange',
    'Dungarees_Black',
    'Dungarees_Green',
    'Dungarees_Red',
    'Dungarees_Violet',
    'Laborer_Blue',
    'Laborer_Red',
    'Laborer_Violet',
    'Vest_Brown',
    'Vest_Brown_Light',
    'Vest_Yellow',
  ].map((name) => ({
    layer: 'outfit',
    id: `farmer_outfit_${name.toLowerCase()}`,
    file: `Outfits/16x16/Outfit_${name}.png`,
  })),
  ...[
    'Short_Blonde',
    'Short_Brown_Dark',
    'Short_Gray',
    'Short_Orange',
    'Long_Blonde',
    'Long_Brown_Dark',
    'Long_Gray',
    'Long_Orange',
    'Tuft_Blonde',
    'Tuft_Brown_Dark',
    'Unkept_Brown_Dark',
    'Unkept_Orange',
  ].map((name) => ({
    layer: 'hair',
    id: `farmer_hair_${name.toLowerCase()}`,
    file: `Hairstyles/16x16/Hairstyle_${name}.png`,
  })),
  ...[
    'Bamboo_Hat_Brown',
    'Bamboo_Hat_Brown_Dull',
    'Gas_Mask',
    'Straw_Hat_Black',
    'Straw_Hat_Cyan',
    'Straw_Hat_Green',
    'Straw_Hat_Red',
    'Straw_Hat_Violet',
  ].map((name) => ({
    layer: 'accessory',
    id: `farmer_acc_${name.toLowerCase()}`,
    file: `Accessories/16x16/Accessory_${name}.png`,
  })),
];

for (const { layer } of imports) {
  await mkdir(path.join(cgRoot, layer), { recursive: true });
}

await Promise.all(
  imports.map(({ layer, id }) => rm(path.join(cgRoot, layer, `${id}.png`), { force: true })),
);

await Promise.all(
  imports.map(({ layer, id, file }) =>
    copyFile(path.join(sourceRoot, file), path.join(cgRoot, layer, `${id}.png`)),
  ),
);

console.log(`Imported ${imports.length} farmer character variants.`);
