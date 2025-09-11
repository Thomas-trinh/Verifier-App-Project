// ---- Debug switch -----------------------------------------------------------
const DEBUG =
  process.env.DEBUG_VALIDATION === 'true' || process.env.NODE_ENV !== 'production';
const dlog = (...args: any[]) => {
  if (DEBUG) console.log('[AusPost]', ...args);
};
// ----------------------------------------------------------------------------

// Environment (fail fast)
const AUSPOST_BASE_URL = process.env.AUSPOST_BASE_URL;
const AUSPOST_BEARER   = process.env.AUSPOST_BEARER;
if (!AUSPOST_BASE_URL) throw new Error('AUSPOST_BASE_URL is not set');
if (!AUSPOST_BEARER)   throw new Error('AUSPOST_BEARER is not set');

// Types (as returned by AusPost)
export type AusPostLocality = {
  latitude?: number | string;
  longitude?: number | string;
  location?: string;
  postcode?: string;
  state?: string;
};
type AusPostResponse = {
  localities?: { locality?: AusPostLocality[] | AusPostLocality };
};

// Result type used by resolvers/services
export type ValidationResult = {
  success: boolean;
  message?: string | null;
  lat?: number;
  lng?: number;
};

/** Uppercase + trim (for strict comparisons). */
function toUpperTrim(s: string): string {
  return s.trim().toUpperCase();
}

/**
 * Normalize a string for fuzzy comparisons:
 * - Convert to uppercase
 * - Replace all non-alphanumeric characters with spaces
 * - Collapse multiple spaces into one
 * - Trim spaces at the start/end
 */
function normalizeForFuzzyMatch(s: string): string {
  const upper = toUpperTrim(s);
  const withSpaces = upper.replace(/[^A-Z0-9]+/g, ' ');
  const collapsed = withSpaces.replace(/\s+/g, ' ').trim();
  return collapsed;
}

/**
 * Convert a value to a number if possible.
 * Returns `undefined` for null/undefined/NaN/Infinity.
 */
function toNumberOrUndefined(n: unknown): number | undefined {
  if (n == null) return undefined;
  const num = Number(n);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Ensure a value is always returned as an array.
 * - If already an array → return as-is
 * - If null/undefined → return []
 * - Otherwise → wrap in an array
 */
function toArray<T>(x: T | T[] | null | undefined): T[] {
  if (Array.isArray(x)) return x;
  if (x == null) return [];
  return [x];
}


/**
 * Low-level call to AusPost suggest endpoint.
 * Returns a flat list of `locality` items.
 */
export async function fetchLocalities(q: string, state?: string): Promise<AusPostLocality[]> {
  const url = new URL(AUSPOST_BASE_URL!);
  url.searchParams.set('q', q);
  if (state) url.searchParams.set('state', state);

  dlog('Request =>', { q, state, url: url.toString() });

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUSPOST_BEARER}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    dlog('Error status:', res.status, res.statusText, 'body:', text.slice(0, 500));
    throw new Error(`AusPost API error: ${res.status} ${res.statusText}`);
  }

  let json: AusPostResponse;
  try {
    json = JSON.parse(text) as AusPostResponse;
  } catch {
    dlog('JSON parse failed, raw body:', text.slice(0, 500));
    throw new Error('AusPost API returned non-JSON');
  }

  const list = toArray(json?.localities?.locality);
  dlog('Total results:', list.length, 'sample:', list[0]);
  return list;
}

/**
 * Domain validation: postcode + suburb + state against AusPost.
 * Returns a ValidationResult with optional lat/lng on success.
 */
export async function validateAgainstAusPost(
  postcode: string,
  suburb: string,
  state: string
): Promise<ValidationResult> {
  const pc  = toUpperTrim(postcode);
  const sb  = toUpperTrim(suburb);
  const sbL = normalizeForFuzzyMatch(suburb);
  const st  = toUpperTrim(state);

  // Query by postcode + state
  const list    = await fetchLocalities(pc, st);
  const inState = list.filter((x) => toUpperTrim(x.state ?? '') === st);
  const exactPc = inState.filter((x) => (x.postcode ?? '').trim() === pc);

  dlog('Filter counts =>', {
    total: list.length,
    inState: inState.length,
    exactPc: exactPc.length,
    target: { pc, sb, st },
  });

  if (exactPc.length === 0) {
    const msg = `The postcode ${postcode} does not exist in the state ${state}.`;
    dlog('Result:', msg);
    return { success: false, message: msg };
  }

  // Strict equality first
  let hit = exactPc.find((x) => toUpperTrim(x.location ?? '') === sb);

  // Fuzzy matching
  if (!hit) {
    hit = exactPc.find((x) => {
      const loc = normalizeForFuzzyMatch(x.location ?? '');
      return loc === sbL || loc.startsWith(sbL) || sbL.startsWith(loc) || loc.includes(sbL);
    });
  }

  if (!hit) {
    const msg = `The postcode ${postcode} does not match the suburb ${suburb}.`;
    dlog('Result:', msg, 'candidate sample:', exactPc[0]);
    return { success: false, message: msg };
  }

  const lat = toNumberOrUndefined(hit.latitude);
  const lng = toNumberOrUndefined(hit.longitude);
  const okMsg = 'The postcode, suburb, and state input are valid.';
  dlog('Result: OK', { lat, lng, suburbHit: hit.location });

  return { success: true, message: okMsg, lat, lng };
}
