#!/usr/bin/env node
/**
 * يتحقق من صحة كل ملفات الوحدات في src/content/units.
 * يُشغَّل بـ `npm run content:check`، ويُستدعى أيضًا من build-content.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const UNITS_DIR = new URL('../src/content/units/', import.meta.url).pathname;
const COLORS = ['green', 'blue', 'purple', 'orange', 'red', 'teal', 'pink', 'indigo'];
const TYPES = new Set(['info', 'mcq', 'tf', 'order', 'match', 'fill']);

export function checkUnit(unit, file) {
  const errs = [];
  const E = (p, m) => errs.push(`${file} ${p}: ${m}`);

  if (!/^u\d{2}$/.test(unit.id ?? '')) E('unit', `id must match u\\d\\d, got ${JSON.stringify(unit.id)}`);
  if (!unit.title) E('unit', 'missing title');
  if (!unit.subtitle) E('unit', 'missing subtitle');
  if (!COLORS.includes(unit.color)) E('unit', `color must be one of ${COLORS.join('|')}, got ${JSON.stringify(unit.color)}`);
  if (!unit.source?.book) E('unit', 'missing source.book');
  if (!Array.isArray(unit.source?.pages) || unit.source.pages.length !== 2) E('unit', 'source.pages must be [from,to]');
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
  const loaded = loadUnits();
  const errs = loaded.flatMap(({ file, unit }) => checkUnit(unit, file));
  const ids = loaded.map(({ unit }) => unit.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errs.push(`duplicate unit ids: ${[...new Set(dupes)].join(', ')}`);
  return { loaded, errs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { loaded, errs } = checkAll();
  const lessons = loaded.reduce((n, { unit }) => n + unit.lessons.length, 0);
  const items = loaded.reduce((n, { unit }) => n + unit.lessons.reduce((m, l) => m + l.items.length, 0), 0);
  console.log(`${loaded.length} units · ${lessons} lessons · ${items} items`);
  errs.forEach((e) => console.log('ERROR ' + e));
  console.log(errs.length ? `\nFAIL (${errs.length} errors)` : '\nPASS');
  process.exit(errs.length ? 1 : 0);
}
