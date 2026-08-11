// i18n.js — pure string-lookup logic for chess-classroom's Dutch/French/English UI.
// No DOM, no fetch: dictionaries are passed in as plain objects (loaded by app.js via
// fetch() from locales/*.json) so this module stays unit-testable with `node --test`.
// See wayfinder/tickets/0007-define-i18n-approach.md for the decisions this implements.

export const DEFAULT_LANGUAGE = "nl";
export const SUPPORTED_LANGUAGES = ["nl", "fr", "en"];

export function isSupportedLanguage(lang) {
  return SUPPORTED_LANGUAGES.includes(lang);
}

// First-run default only: browser-locale auto-detect never overrides an explicit
// later choice (ticket 0007) — callers must pass `storedLanguage` as null/undefined
// once, on first run only, and the persisted value every time after that.
export function detectInitialLanguage(navigatorLanguages, storedLanguage) {
  if (isSupportedLanguage(storedLanguage)) {
    return storedLanguage;
  }
  for (const tag of navigatorLanguages || []) {
    const short = String(tag).slice(0, 2).toLowerCase();
    if (isSupportedLanguage(short)) {
      return short;
    }
  }
  return DEFAULT_LANGUAGE;
}

// Looks up `key` in `dictionaries[lang]`, falling back to DEFAULT_LANGUAGE's
// dictionary, then to the raw key itself (a visible marker of a missing
// translation, rather than a blank UI or a thrown error mid-lesson).
export function translate(dictionaries, lang, key, vars) {
  const primary = dictionaries[lang] || {};
  const fallback = dictionaries[DEFAULT_LANGUAGE] || {};
  const template = key in primary ? primary[key] : fallback[key];
  if (template === undefined) {
    return key;
  }
  return interpolate(template, vars);
}

function interpolate(template, vars) {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  );
}

// Builds a bound `t(key, vars)` function for a fixed language + dictionary set —
// what app.js actually hands its render functions instead of re-passing all three
// translate() arguments everywhere.
export function createTranslator(dictionaries, lang) {
  return (key, vars) => translate(dictionaries, lang, key, vars);
}
