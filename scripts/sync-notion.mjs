import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.NOTION_TOKEN;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;

if (!token) throw new Error('Missing NOTION_TOKEN');
if (!dataSourceId) throw new Error('Missing NOTION_DATA_SOURCE_ID');

const NOTION_VERSION = '2026-03-11';
const endpoint = `https://api.notion.com/v1/data_sources/${dataSourceId}/query`;

function plainText(items = []) {
  return items.map(item => item.plain_text ?? item.text?.content ?? '').join('').trim();
}

function readProperty(property) {
  if (!property) return '';
  switch (property.type) {
    case 'title': return plainText(property.title);
    case 'rich_text': return plainText(property.rich_text);
    case 'select': return property.select?.name ?? '';
    case 'status': return property.status?.name ?? '';
    case 'date': return property.date?.start ?? '';
    default: return '';
  }
}

async function queryPage(startCursor) {
  const body = { page_size: 100 };
  if (startCursor) body.start_cursor = startCursor;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notion API ${response.status}: ${detail}`);
  }

  return response.json();
}

const pages = [];
let cursor;

do {
  const response = await queryPage(cursor);
  pages.push(...response.results.filter(item => item.object === 'page'));
  cursor = response.has_more ? response.next_cursor : undefined;
} while (cursor);

const words = pages
  .map(page => {
    const p = page.properties ?? {};
    return {
      word: readProperty(p['單字']),
      meaning: readProperty(p['中文']),
      example: readProperty(p['例句']),
      addedDate: readProperty(p['加入日期']),
      familiarity: readProperty(p['熟悉度']),
      pos: readProperty(p['詞性']) || 'other',
    };
  })
  .filter(item => item.word && item.meaning)
  .sort((a, b) => a.word.localeCompare(b.word, 'en'));

if (words.length < 4) {
  throw new Error(`Only ${words.length} usable rows were returned. Need at least 4.`);
}

await mkdir('data', { recursive: true });
await writeFile('data/words.json', `${JSON.stringify(words, null, 2)}\n`, 'utf8');
console.log(`Synced ${words.length} vocabulary items.`);
