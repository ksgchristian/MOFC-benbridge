/**
 * Picks the most natural-sounding read-aloud voice the device has for a
 * language. Browsers often default to a robotic voice even when much better
 * ones are installed (Apple "Premium"/"Enhanced", Google, Microsoft "Natural").
 */
export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

/** Named voices known to sound warm and clear, best first. */
const PREFERRED: Record<string, string[]> = {
  es: ["Paulina", "Mónica", "Monica", "Marisol", "Google español de Estados Unidos", "Google español", "Sabina", "Dalia", "Elvira"],
  en: ["Ava", "Samantha", "Zoe", "Allison", "Google US English", "Aria", "Jenny", "Emma"],
};

/** macOS joke/novelty voices that should never be picked. */
const NOVELTY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Grandma|Grandpa|Rocko|Shelley|Flo|Eddy|Reed|Sandy)\b/i;

function score(v: VoiceLike, locale: string): number {
  const lang = v.lang.replace("_", "-").toLowerCase();
  const want = locale.toLowerCase();
  const base = want.split("-")[0];
  if (!lang.startsWith(base)) return -Infinity;
  if (NOVELTY.test(v.name)) return -Infinity;

  let s = 0;
  if (lang === want) s += 20; // es-US over es-ES, en-US over en-GB
  else if (base === "es" && /^es-(mx|419|us)/.test(lang)) s += 12; // Latin American Spanish is closest to Central Ohio speakers
  if (/premium/i.test(v.name)) s += 40;
  if (/enhanced/i.test(v.name)) s += 30;
  if (/natural|neural|online/i.test(v.name)) s += 30;
  if (/google/i.test(v.name)) s += 15;
  const rank = (PREFERRED[base] ?? []).findIndex((n) => v.name.toLowerCase().includes(n.toLowerCase()));
  if (rank >= 0) s += 25 - rank;
  if (/compact/i.test(v.name)) s -= 15;
  return s;
}

export function pickVoice<V extends VoiceLike>(voices: readonly V[], locale: string): V | null {
  let best: V | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    const s = score(v, locale);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return best;
}

/** Slightly slower and a touch warmer than the default reads as friendlier. */
export const FRIENDLY_SPEECH = { rate: 0.95, pitch: 1.05 };
