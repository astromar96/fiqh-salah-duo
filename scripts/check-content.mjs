#!/usr/bin/env node
/**
 * يتحقق من صحة كل ملفات الوحدات في src/content/units.
 * يُشغَّل بـ `npm run content:check`، ويُستدعى أيضًا من build-content.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const UNITS_DIR = new URL('../src/content/units/', import.meta.url).pathname;
const SECTIONS_FILE = new URL('../src/content/sections.json', import.meta.url).pathname;
const COLORS = ['green', 'blue', 'purple', 'orange', 'red', 'teal', 'pink', 'indigo'];
const TYPES = new Set(['info', 'mcq', 'tf', 'order', 'match', 'fill']);

export function loadSections() {
  return JSON.parse(readFileSync(SECTIONS_FILE, 'utf8'));
}

export function checkSections(sections) {
  const errs = [];
  const E = (m) => errs.push(`sections.json: ${m}`);
  if (!Array.isArray(sections) || sections.length === 0) {
    E('must be a non-empty array');
    return errs;
  }
  const ids = new Set();
  sections.forEach((s, i) => {
    if (!/^s\d$/.test(s.id ?? '')) E(`[${i}] id must match s\\d, got ${JSON.stringify(s.id)}`);
    if (ids.has(s.id)) E(`[${i}] duplicate id ${s.id}`);
    ids.add(s.id);
    for (const k of ['title', 'subtitle', 'blurb']) if (!s[k]) E(`[${i}] missing ${k}`);
    if (!COLORS.includes(s.color)) E(`[${i}] color must be one of ${COLORS.join('|')}`);
    if (!Array.isArray(s.pages) || s.pages.length !== 2 || s.pages[0] > s.pages[1]) {
      E(`[${i}] pages must be [from,to] with from <= to`);
    }
  });
  return errs;
}

export function checkUnit(unit, file, sections = []) {
  const errs = [];
  const E = (p, m) => errs.push(`${file} ${p}: ${m}`);

  if (!/^u\d{2,3}$/.test(unit.id ?? '')) E('unit', `id must match u\\d\\d(\\d)?, got ${JSON.stringify(unit.id)}`);
  if (!unit.title) E('unit', 'missing title');
  if (!unit.subtitle) E('unit', 'missing subtitle');
  if (!COLORS.includes(unit.color)) E('unit', `color must be one of ${COLORS.join('|')}, got ${JSON.stringify(unit.color)}`);
  if (!unit.source?.book) E('unit', 'missing source.book');
  if (!Array.isArray(unit.source?.pages) || unit.source.pages.length !== 2) E('unit', 'source.pages must be [from,to]');
  else if (unit.source.pages[0] > unit.source.pages[1]) E('unit', 'source.pages must be ascending');

  const section = sections.find((s) => s.id === unit.section);
  if (!unit.section) E('unit', 'missing section');
  else if (sections.length && !section) E('unit', `unknown section ${JSON.stringify(unit.section)}`);
  else if (section && Array.isArray(unit.source?.pages)) {
    // صفحات الوحدة يجب أن تقع داخل صفحات بابها، وإلا ظهرت الوحدة في الباب الخطأ.
    const [sa, sb] = section.pages;
    const [ua, ub] = unit.source.pages;
    if (ua < sa || ub > sb) E('unit', `pages ${ua}-${ub} outside section ${section.id} (${sa}-${sb})`);
  }
  if (!Array.isArray(unit.lessons) || unit.lessons.length === 0) {
    E('unit', 'lessons must be a non-empty array');
    return errs;
  }

  const seen = new Set();
  unit.lessons.forEach((lesson, li) => {
    const lp = `lessons[${li}]`;
    const expected = `${unit.id}l${li + 1}`;
    if (lesson.id !== expected) E(lp, `id should be ${expected}, got ${JSON.stringify(lesson.id)}`);
    if (!lesson.title) E(lp, 'missing title');
    const items = lesson.items;
    if (!Array.isArray(items) || items.length === 0) { E(lp, 'items must be a non-empty array'); return; }
    if (!items.some((i) => i?.t !== 'info')) E(lp, 'lesson has no gradable question');

    items.forEach((it, ii) => {
      const p = `${lp}.items[${ii}]`;
      if (!it || typeof it !== 'object') { E(p, 'not an object'); return; }
      if (!TYPES.has(it.t)) { E(p, `unknown type ${JSON.stringify(it.t)}`); return; }
      if (typeof it.src !== 'number') E(p, 'missing numeric src');
      else {
        const [a, b] = unit.source?.pages ?? [0, 9999];
        if (it.src < a || it.src > b) E(p, `src ${it.src} outside unit pages ${a}-${b}`);
      }
      const prompt = (it.q ?? it.h ?? '').replace(/\s+/g, ' ').trim();
      if (prompt) {
        if (seen.has(prompt)) E(p, `duplicate prompt: ${prompt.slice(0, 48)}`);
        seen.add(prompt);
      }
      if (it.t === 'info') {
        if (!it.h) E(p, 'info needs h');
        if (!it.b) E(p, 'info needs b');
        return;
      }
      if (!it.q) E(p, 'needs q');
      if (!it.e) E(p, 'needs e');
      if (it.t === 'mcq') {
        if (!Array.isArray(it.o) || it.o.length < 2) E(p, 'mcq needs at least 2 options');
        else {
          if (new Set(it.o.map(String)).size !== it.o.length) E(p, 'mcq has duplicate options');
          if (!Number.isInteger(it.a) || it.a < 0 || it.a >= it.o.length) E(p, `mcq a out of range: ${it.a}`);
        }
      }
      if (it.t === 'tf' && typeof it.a !== 'boolean') E(p, 'tf a must be boolean');
      if (it.t === 'order') {
        if (!Array.isArray(it.items) || it.items.length < 2) E(p, 'order needs at least 2 items');
        else if (new Set(it.items.map(String)).size !== it.items.length) E(p, 'order has duplicates');
      }
      if (it.t === 'match') {
        if (!Array.isArray(it.pairs) || it.pairs.length < 2) E(p, 'match needs at least 2 pairs');
        else {
          const L = it.pairs.map((x) => String(x?.[0])), R = it.pairs.map((x) => String(x?.[1]));
          it.pairs.forEach((pr, pi) => {
            if (!Array.isArray(pr) || pr.length !== 2 || !pr[0] || !pr[1]) E(`${p}.pairs[${pi}]`, 'must be [left,right]');
          });
          if (new Set(L).size !== L.length) E(p, 'duplicate left sides');
          if (new Set(R).size !== R.length) E(p, 'duplicate right sides');
        }
      }
      if (it.t === 'fill') {
        const n = (String(it.q ?? '').match(/____/g) ?? []).length;
        if (n !== 1) E(p, `fill q must contain exactly one ____ (found ${n})`);
        if (!Array.isArray(it.bank) || it.bank.length < 2) E(p, 'fill needs a bank of at least 2');
        else {
          if (new Set(it.bank.map(String)).size !== it.bank.length) E(p, 'fill bank has duplicates');
          if (!it.bank.map(String).includes(String(it.a))) E(p, `fill a=${JSON.stringify(it.a)} not in bank`);
        }
      }
    });
  });
  return errs;
}

export function loadUnits() {
  const files = readdirSync(UNITS_DIR).filter((f) => f.endsWith('.json')).sort();
  return files.map((file) => ({ file, unit: JSON.parse(readFileSync(join(UNITS_DIR, file), 'utf8')) }));
}

export function checkAll() {
  const sections = loadSections();
  const loaded = loadUnits();
  const errs = [
    ...checkSections(sections),
    ...loaded.flatMap(({ file, unit }) => checkUnit(unit, file, sections)),
  ];
  const ids = loaded.map(({ unit }) => unit.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errs.push(`duplicate unit ids: ${[...new Set(dupes)].join(', ')}`);
  // وحدتان في نفس الباب لا تتداخل صفحاتهما — تداخلٌ يعني ازدواج المادة.
  for (const s of sections) {
    const inSection = loaded
      .filter(({ unit }) => unit.section === s.id && Array.isArray(unit.source?.pages))
      .sort((a, b) => a.unit.source.pages[0] - b.unit.source.pages[0]);
    inSection.forEach(({ unit }, i) => {
      const next = inSection[i + 1]?.unit;
      if (next && next.source.pages[0] <= unit.source.pages[1]) {
        errs.push(`${unit.id} and ${next.id} overlap on pages ${next.source.pages[0]}-${unit.source.pages[1]}`);
      }
    });
  }
  return { loaded, errs, sections };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { loaded, errs, sections } = checkAll();
  const lessons = loaded.reduce((n, { unit }) => n + unit.lessons.length, 0);
  const items = loaded.reduce((n, { unit }) => n + unit.lessons.reduce((m, l) => m + l.items.length, 0), 0);
  for (const s of sections) {
    const mine = loaded.filter(({ unit }) => unit.section === s.id);
    const li = mine.reduce((n, { unit }) => n + unit.lessons.length, 0);
    const it = mine.reduce((n, { unit }) => n + unit.lessons.reduce((m, l) => m + l.items.length, 0), 0);
    console.log(`  ${s.id} ${s.title.padEnd(12)} ${String(mine.length).padStart(2)} units · ${String(li).padStart(3)} lessons · ${String(it).padStart(4)} items`);
  }
  console.log(`${loaded.length} units · ${lessons} lessons · ${items} items`);
  errs.forEach((e) => console.log('ERROR ' + e));
  console.log(errs.length ? `\nFAIL (${errs.length} errors)` : '\nPASS');
  process.exit(errs.length ? 1 : 0);
}
