/* ============================================================
   Finora — графики на чистом SVG. Без библиотек.
   ============================================================ */

import { icon } from './icons';
import { esc, money, moneyShort } from './utils';

/* ---------- Донат по категориям ---------- */

export interface DonutSlice { id: string; label: string; value: number; color: string; icon?: string }

export function donut(
  slices: DonutSlice[],
  size: number,
  thickness: number,
  centerTitle: string,
  centerValue: string,
): string {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  if (total <= 0) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${thickness}"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="var(--text-3)" font-size="12">нет данных</text>
    </svg>`;
  }
  const C = 2 * Math.PI * r;
  let offset = 0;
  const segs = slices
    .map((s) => {
      const frac = s.value / total;
      const len = Math.max(frac * C - 2.5, 1.2); // зазор между сегментами
      const gap = 2.5;
      const rot = (offset / C) * 360 - 90;
      offset += frac * C;
      return `<circle class="donut-seg" data-slice="${esc(s.id)}" cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${s.color}" stroke-width="${thickness}" stroke-linecap="butt"
        stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" transform="rotate(${rot.toFixed(2)} ${cx} ${cy})"/${gap > 0 ? '' : ''}>`;
    })
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(centerTitle)}">
    ${segs}
    <text x="${cx}" y="${cy - 9}" text-anchor="middle" fill="var(--text-3)" font-size="11.5" font-weight="550">${esc(centerTitle)}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--text)" font-size="17" font-weight="650" font-family="var(--font-mono)">${esc(centerValue)}</text>
  </svg>`;
}

/* ---------- Столбчатая диаграмма доходы/расходы ---------- */

export interface BarPair { label: string; income: number; expense: number }

export function barChart(data: BarPair[], w: number, h: number): string {
  if (!data.length) return `<div class="empty" style="padding:20px">${icon('pie', 22)}<p>Пока нет данных за период</p></div>`;
  const max = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const n = data.length;
  const padB = 26;
  const padT = 8;
  const inner = h - padB - padT;
  const slot = w / n;
  const bw = Math.min(14, slot * 0.32);
  const gap = 4;

  const bars = data
    .map((d, i) => {
      const xC = slot * i + slot / 2;
      const hI = Math.max(2, (d.income / max) * inner);
      const hE = Math.max(2, (d.expense / max) * inner);
      return `
      <g class="bar-pair" data-i="${i}">
        <rect x="${(xC - bw - gap / 2).toFixed(1)}" y="${(padT + inner - hI).toFixed(1)}" width="${bw}" height="${hI.toFixed(1)}" rx="3.5" fill="var(--income)" opacity="0.92"/>
        <rect x="${(xC + gap / 2).toFixed(1)}" y="${(padT + inner - hE).toFixed(1)}" width="${bw}" height="${hE.toFixed(1)}" rx="3.5" fill="var(--expense)" opacity="0.72"/>
        <text x="${xC.toFixed(1)}" y="${h - 8}" text-anchor="middle" fill="var(--text-3)" font-size="10.5">${esc(d.label)}</text>
      </g>`;
    })
    .join('');

  const grid = [0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = padT + inner - inner * f;
      return `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 5" opacity="0.55"/>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img">${grid}${bars}</svg>`;
}

/* ---------- Спарклайн баланса ---------- */

export function sparkline(pts: { x: string; v: number }[], w: number, h: number, showArea = true): string {
  if (pts.length < 2) return '';
  const vs = pts.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || 1;
  const pad = 4;
  const X = (i: number) => (i / (pts.length - 1)) * (w - pad * 2) + pad;
  const Y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(pts.length - 1).toFixed(1)} ${h} L${X(0).toFixed(1)} ${h} Z`;
  const lastX = X(pts.length - 1).toFixed(1);
  const lastY = Y(vs[vs.length - 1]).toFixed(1);

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Динамика баланса">
    ${showArea ? `<path d="${area}" fill="var(--accent-final)" opacity="0.09"/>` : ''}
    <path d="${line}" fill="none" stroke="var(--accent-final)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${lastX}" cy="${lastY}" r="3" fill="var(--accent-final)"/>
  </svg>`;
}

/* ---------- Полосы категорий (легенда с прогрессом) ---------- */

export function categoryBars(
  rows: { id: string; label: string; value: number; color: string; icon: string; count: number }[],
  max: number,
): string {
  return rows
    .map(
      (r) => `
    <div class="legend-row" data-slice="${esc(r.id)}" title="${esc(r.label)}">
      <span class="cat-tile" style="--cat:${r.color}; width:28px;height:28px;border-radius:9px">${icon(r.icon as never, 15)}</span>
      <span class="grow ellipsis">${esc(r.label)}</span>
      <span class="num legend-val">${money(r.value, false, true)}</span>
    </div>`,
    )
    .join('');
}

/* ---------- Горизонтальные полосы сравнения периодов ---------- */

export function compareBars(
  rows: { label: string; a: number; b: number; color: string }[],
  max: number,
  labelA: string,
  labelB: string,
): string {
  const row = (r: { label: string; a: number; b: number; color: string }) => `
    <div style="display:grid;grid-template-columns:110px 1fr 90px;gap:10px;align-items:center;padding:7px 0">
      <span class="ellipsis" style="font-size:12.5px;color:var(--text-2)">${esc(r.label)}</span>
      <span style="display:flex;flex-direction:column;gap:3px">
        <span class="progress" style="height:6px"><i style="width:${max ? Math.round((r.a / max) * 100) : 0}%;background:${r.color}"></i></span>
        <span class="progress" style="height:6px;opacity:0.45"><i style="width:${max ? Math.round((r.b / max) * 100) : 0}%;background:${r.color}"></i></span>
      </span>
      <span class="num" style="text-align:right;font-size:12.5px">${moneyShort(r.a)}</span>
    </div>`;
  const legend = `
    <div class="row" style="gap:14px;margin-bottom:6px;font-size:11.5px;color:var(--text-3)">
      <span class="row" style="gap:6px"><i class="dot" style="background:var(--accent-final)"></i>${esc(labelA)}</span>
      <span class="row" style="gap:6px"><i class="dot" style="background:var(--accent-final);opacity:0.4"></i>${esc(labelB)}</span>
    </div>`;
  return legend + rows.map(row).join('');
}
