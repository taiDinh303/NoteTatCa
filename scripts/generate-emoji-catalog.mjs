// Run from repository root. Generates local Unicode data; no runtime requests.
import { writeFile, mkdir } from 'node:fs/promises';
const cldr = '7d2b9cb11cec08f4d333ad73209deb3df0711c3b';
const root = `https://raw.githubusercontent.com/unicode-org/cldr-json/${cldr}/cldr-json`;
const get = async url => { const response = await fetch(url); if (!response.ok) throw new Error(`${response.status}: ${url}`); return response.text(); };
const [emoji, en, vi, enDerived, viDerived, license] = await Promise.all([
  get('https://unicode.org/Public/17.0.0/emoji/emoji-test.txt'),
  ...['en', 'vi'].map(lang => get(`${root}/cldr-annotations-full/annotations/${lang}/annotations.json`)),
  ...['en', 'vi'].map(lang => get(`${root}/cldr-annotations-derived-full/annotationsDerived/${lang}/annotations.json`)),
  get('https://www.unicode.org/license.txt'),
]);
const annotations = (base, derived) => ({ ...JSON.parse(base).annotations.annotations, ...JSON.parse(derived).annotationsDerived.annotations });
const english = annotations(en, enDerived), vietnamese = annotations(vi, viDerived);
const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();
const key = value => value.replace(/\uFE0F/g, '');
const keywords = values => [...new Set(normalize(values.join(' ')).split(/\s+/))].join(' ');
const groups = [], items = [];
let group = '';
for (const line of emoji.split('\n')) {
  if (line.startsWith('# group: ')) { group = line.slice(9).trim(); if (group !== 'Component') groups.push(group); }
  const match = line.match(/^([\dA-F ]+)\s*;\s*fully-qualified\s*#\s*\S+\s+E[\d.]+\s+(.+)$/);
  if (!match || group === 'Component') continue;
  const value = String.fromCodePoint(...match[1].trim().split(/ +/).map(code => parseInt(code, 16)));
  const en = english[value] ?? english[key(value)], vi = vietnamese[value] ?? vietnamese[key(value)];
  const name = en?.tts?.[0] ?? match[2].trim(), local = vi?.tts?.[0] ?? name;
  items.push([value, groups.indexOf(group), name, local, keywords([name, local, ...(en?.default ?? []), ...(vi?.default ?? [])])]);
}
groups.push('Special characters');
const special = [
  ['★','black star','ngôi sao đen'], ['☆','white star','ngôi sao trắng'], ['✓','check mark','dấu tích đúng'], ['✔','heavy check mark','dấu tích đậm'],
  ['→','right arrow','mũi tên phải'], ['←','left arrow','mũi tên trái'], ['↑','up arrow','mũi tên lên'], ['↓','down arrow','mũi tên xuống'],
  ['↔','left right arrow','mũi tên hai chiều'], ['↗','up right arrow','mũi tên chéo lên'], ['↘','down right arrow','mũi tên chéo xuống'],
  ['♥','heart','trái tim'], ['♡','white heart','trái tim trắng'], ['✦','four pointed star','ngôi sao bốn cánh'], ['✧','white four pointed star','ngôi sao rỗng'],
  ['•','bullet dot','dấu chấm đầu dòng'], ['◦','white bullet','chấm tròn rỗng'], ['●','black circle','hình tròn đen'], ['○','white circle','hình tròn trắng'],
  ['■','black square','hình vuông đen'], ['□','white square','hình vuông trắng'], ['▲','triangle up','tam giác lên'], ['▼','triangle down','tam giác xuống'],
  ['◆','diamond','hình thoi'], ['◇','white diamond','hình thoi trắng'], ['✕','cross','dấu nhân'], ['✗','ballot cross','dấu sai'],
  ['∞','infinity','vô cực'], ['≈','approximately equal','xấp xỉ'], ['≠','not equal','khác không bằng'], ['≤','less than or equal','nhỏ hơn hoặc bằng'],
  ['≥','greater than or equal','lớn hơn hoặc bằng'], ['±','plus minus','cộng trừ'], ['×','multiplication','phép nhân'], ['÷','division','phép chia'],
  ['√','square root','căn bậc hai'], ['π','pi','số pi'], ['∑','sum','tổng'], ['∫','integral','tích phân'], ['°','degree','độ'],
  ['€','euro','tiền euro'], ['£','pound','bảng Anh'], ['¥','yen','yên Nhật'], ['₫','dong','tiền đồng'], ['©','copyright','bản quyền'],
  ['®','registered','đã đăng ký'], ['™','trademark','thương hiệu'], ['♪','music note','nốt nhạc'], ['♫','music notes','nốt nhạc đôi'],
  ...Array.from({length:26}, (_, i) => [String.fromCodePoint(0x1F1E6+i), `regional indicator ${String.fromCharCode(65+i)}`, `chữ cái ${String.fromCharCode(65+i)}`]),
];
for (const [value, en, vi] of special) if (!items.some(item => item[0] === value)) items.push([value, groups.length - 1, en, vi, normalize(`${en} ${vi}`)]);
// Share repeated search words across skin-tone/family variants without dropping
// any characters or bilingual search terms.
const words = [], wordIds = new Map();
for (const item of items) item[4] = item[4].split(/\s+/).map(word => {
  if (!wordIds.has(word)) { wordIds.set(word, words.length); words.push(word); }
  return wordIds.get(word).toString(36);
}).join('.');
await mkdir('ntc_react/src/features/editor/emoji', { recursive: true });
const grouped = groups.map((_, index) => items.filter(item => item[1] === index).map(([value, , en, vi, keywords]) => [value, en, vi, keywords]));
await writeFile('ntc_react/src/features/editor/emoji/catalog.json', JSON.stringify({ unicode:'17.0', cldr, groups, words, items: grouped })+'\n');
await writeFile('ntc_react/src/features/editor/emoji/UNICODE-LICENSE.txt', license);
console.log(`${items.length} unique entries; ${groups.length} groups; CLDR ${cldr}`);
