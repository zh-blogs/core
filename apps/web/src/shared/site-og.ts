import { ZHBLOGS_SITE_NAME } from '@/shared/seo';

export interface SiteOgCardInput {
  name: string;
  url: string;
  description: string;
  joinTime: string;
}

const SITE_OG_WIDTH = 1200;
const SITE_OG_HEIGHT = 640;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function extractDisplayUrl(value: string): string {
  try {
    const target = new URL(value);
    return `${target.host}${target.pathname === '/' ? '' : target.pathname}`;
  } catch {
    return value;
  }
}

function formatOgDate(value: string): string {
  const target = new Date(value);

  if (Number.isNaN(target.getTime())) {
    return '未记录';
  }

  return `${target.getFullYear()}.${String(target.getMonth() + 1).padStart(2, '0')}.${String(
    target.getDate(),
  ).padStart(2, '0')}`;
}

function measureUnits(char: string): number {
  return (char.codePointAt(0) ?? 0) <= 0xff ? 0.58 : 1;
}

function trimToUnits(value: string, maxUnits: number): string {
  let units = 0;
  let output = '';

  for (const char of value) {
    const nextUnits = units + measureUnits(char);

    if (nextUnits > maxUnits) {
      break;
    }

    output += char;
    units = nextUnits;
  }

  return output.trimEnd();
}

function splitTextLines(value: string, maxUnits: number, maxLines: number): string[] {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [];
  }

  const lines: string[] = [];
  let current = '';
  let currentUnits = 0;

  for (const char of normalized) {
    const charUnits = measureUnits(char);

    if (current && currentUnits + charUnits > maxUnits) {
      lines.push(current.trimEnd());

      if (lines.length === maxLines) {
        const visible = trimToUnits(lines[maxLines - 1] ?? '', maxUnits - 1.2);
        lines[maxLines - 1] = `${visible}…`;
        return lines;
      }

      current = '';
      currentUnits = 0;
    }

    current += char;
    currentUnits += charUnits;
  }

  if (current && lines.length < maxLines) {
    lines.push(current.trimEnd());
  }

  return lines.slice(0, maxLines);
}

function renderTextLines(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  className: string,
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${startY + index * lineHeight}" class="${className}">${escapeXml(
          line,
        )}</text>`,
    )
    .join('');
}

export function buildSiteOgImagePath(slug: string): string {
  return `/og/site/${slug}.svg`;
}

export function buildSiteOgSvg(input: SiteOgCardInput): string {
  const titleLines = splitTextLines(input.name, 14, 2);
  const descriptionLines = splitTextLines(input.description, 26, 3);
  const urlLine = trimToUnits(extractDisplayUrl(input.url), 34);

  return `<svg width="${SITE_OG_WIDTH}" height="${SITE_OG_HEIGHT}" viewBox="0 0 ${SITE_OG_WIDTH} ${SITE_OG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SITE_OG_WIDTH}" height="${SITE_OG_HEIGHT}" rx="32" fill="#F7F3EE"/>
  <rect x="28" y="28" width="1144" height="574" rx="28" fill="#FFFDF8" stroke="#E5D8CB" stroke-width="4"/>

  <rect x="104" y="162" width="256" height="256" rx="16" fill="#C43D2F"/>
  <rect x="104" y="162" width="256" height="256" rx="16" fill="none" stroke="#FFF7F1" stroke-width="4"/>
  <g transform="translate(301 218) scale(-6 6)" fill="none" stroke="#FFF7F1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">
    <path d="M9 6h11"/>
    <path d="M12 12h8"/>
    <path d="M15 18h5"/>
    <path d="M3 6v.01"/>
    <path d="M6 12v.01"/>
    <path d="M9 18v.01"/>
  </g>

  <text x="232" y="456" fill="#FFF7F1" font-family="JetBrains Mono, monospace" font-size="22" letter-spacing="4" text-anchor="middle">SITE PROFILE</text>

  <path d="M424 150H1100" stroke="#D7C5B5" stroke-width="4"/>
  <path d="M424 442H1100" stroke="#E7D9CC" stroke-width="4"/>

  <text x="424" y="110" fill="#8B7A6B" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="3">站点详情 · ${escapeXml(
    ZHBLOGS_SITE_NAME,
  )}</text>
  ${renderTextLines(titleLines, 424, 260, 70, 'title')}
  ${renderTextLines(descriptionLines, 424, 330, 38, 'summary')}

  <g>
    <text x="424" y="492" fill="#8B7A6B" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="2">地址</text>
    <text x="424" y="528" fill="#241E18" font-family="JetBrains Mono, monospace" font-size="28" font-weight="500">${escapeXml(
      urlLine,
    )}</text>
  </g>
  <g>
    <text x="874" y="492" fill="#8B7A6B" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="2">加入日期</text>
    <text x="874" y="528" fill="#241E18" font-family="DM Sans, Arial, sans-serif" font-size="28" font-weight="600">${escapeXml(
      formatOgDate(input.joinTime),
    )}</text>
  </g>

  <text x="104" y="560" fill="#F0D9CE" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="3">ZHBLOGS.NET</text>

  <style>
    .title {
      fill: #241E18;
      font-family: "DM Sans", Arial, sans-serif;
      font-size: 62px;
      font-weight: 600;
    }

    .summary {
      fill: #6A5B4E;
      font-family: "DM Sans", Arial, sans-serif;
      font-size: 26px;
      font-weight: 500;
    }
  </style>
</svg>`;
}
