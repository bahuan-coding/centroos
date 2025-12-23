/**
 * Identity Resolver - Record Linkage de Alta Confiança
 * 
 * Motor de resolução de identidade que determina com score de confiança
 * quando dois registros representam a mesma pessoa.
 * 
 * Algoritmo:
 * 1. Blocking por primeiro token (O(N) → O(k))
 * 2. Multi-feature scoring (Jaccard, Levenshtein, prefix, CPF)
 * 3. Classificação de confiança
 * 
 * @module matching/identity-resolver
 */

import { normalizeName, type NormalizedName } from '../pipeline/normalizers/name';

// =============================================================================
// TYPES
// =============================================================================

export type ConfidenceLevel = 'exact' | 'high' | 'low' | 'none';

export interface FeatureEvidence {
  feature: string;
  contribution: number;
  detail: string;
}

export interface IdentityMatch {
  candidateId: string;
  candidateName: string;
  score: number;
  confidence: ConfidenceLevel;
  evidence: FeatureEvidence[];
}

export interface IndexedPerson {
  id: string;
  name: NormalizedName;
  cpf?: string;
  matricula?: number;
}

export interface BlockingIndex {
  byFirstToken: Map<string, IndexedPerson[]>;
  byLastToken: Map<string, IndexedPerson[]>;
  byPrefix: Map<string, IndexedPerson[]>; // 3-char prefixes of all tokens
  all: IndexedPerson[];
}

// =============================================================================
// FEATURE WEIGHTS
// =============================================================================

const WEIGHTS = {
  cpf_exact: 100,
  normalized_exact: 80,
  token_coverage: 50,    // How many query tokens are found/matched in candidate
  levenshtein_ratio: 35,
  first_token_match: 25,
  prefix_containment: 30, // Query tokens are prefixes of candidate tokens
} as const;

const CONFIDENCE_THRESHOLDS = {
  exact: 95,  // Only for CPF match or exact normalized name
  high: 60,   // Strong match with coverage + prefix
  low: 40,    // Partial match, needs review
} as const;

// =============================================================================
// LEVENSHTEIN DISTANCE
// =============================================================================

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

// =============================================================================
// MAIN SCORING
// =============================================================================

/**
 * Calculates token coverage: what percentage of query tokens are matched/contained in candidate.
 * This handles truncated names well: "GUSTAVO REI" vs "GUSTAVO REIS SARMENTO"
 * REI is a prefix of REIS, so it counts as matched.
 * Also handles initials: "C" matches "CRISTINA".
 */
function tokenCoverage(queryTokens: string[], candidateTokens: string[]): { ratio: number; matched: string[] } {
  if (queryTokens.length === 0) return { ratio: 0, matched: [] };
  
  const matched: string[] = [];
  
  for (const qt of queryTokens) {
    let found = false;
    
    // Exact match
    if (candidateTokens.includes(qt)) {
      matched.push(qt);
      continue;
    }
    
    for (const ct of candidateTokens) {
      // Prefix match (qt is prefix of some candidate token)
      if (ct.startsWith(qt)) {
        // For initials (1-2 chars), require that it's actually an initial
        if (qt.length <= 2) {
          matched.push(`${qt}.→${ct}`);
          found = true;
          break;
        } else if (qt.length >= 3) {
          matched.push(`${qt}→${ct}`);
          found = true;
          break;
        }
      }
      // Reverse: candidate token is prefix of query token
      if (qt.startsWith(ct) && ct.length >= 3) {
        matched.push(`${ct}←${qt}`);
        found = true;
        break;
      }
    }
    
    if (found) continue;
  }
  
  return { ratio: matched.length / queryTokens.length, matched };
}

export function scoreMatch(
  nameA: NormalizedName,
  nameB: NormalizedName,
  cpfA?: string,
  cpfB?: string
): { score: number; evidence: FeatureEvidence[] } {
  const evidence: FeatureEvidence[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  // CPF Exact Match (definitive - if present and matches, instant 100%)
  if (cpfA && cpfB && cpfA.length >= 11 && cpfB.length >= 11) {
    if (cpfA === cpfB) {
      return {
        score: 100,
        evidence: [{
          feature: 'cpf_exact',
          contribution: 100,
          detail: `CPF match: ${cpfA}`,
        }],
      };
    }
  }

  // Normalized Exact Match
  totalWeight += WEIGHTS.normalized_exact;
  if (nameA.normalized === nameB.normalized) {
    weightedSum += WEIGHTS.normalized_exact;
    evidence.push({
      feature: 'normalized_exact',
      contribution: WEIGHTS.normalized_exact,
      detail: `Exact: "${nameA.normalized}"`,
    });
  }

  // Token Coverage (key for truncated names)
  totalWeight += WEIGHTS.token_coverage;
  const coverage = tokenCoverage(nameA.tokens, nameB.tokens);
  const coverageContrib = coverage.ratio * WEIGHTS.token_coverage;
  weightedSum += coverageContrib;
  if (coverage.ratio > 0) {
    evidence.push({
      feature: 'token_coverage',
      contribution: Math.round(coverageContrib),
      detail: `Coverage ${(coverage.ratio * 100).toFixed(0)}%: [${coverage.matched.join(', ')}]`,
    });
  }

  // Levenshtein Ratio (on concatenated tokens - handles typos)
  totalWeight += WEIGHTS.levenshtein_ratio;
  const concatA = nameA.tokens.join('');
  const concatB = nameB.tokens.join('');
  const shorterStr = concatA.length <= concatB.length ? concatA : concatB;
  const longerStr = concatA.length > concatB.length ? concatA : concatB;
  // Check if shorter is prefix of longer (truncation case)
  const isPrefixMatch = longerStr.startsWith(shorterStr);
  const levRatio = isPrefixMatch ? 1 : levenshteinRatio(concatA, concatB);
  const levContrib = levRatio * WEIGHTS.levenshtein_ratio;
  weightedSum += levContrib;
  if (levRatio > 0.4) {
    evidence.push({
      feature: 'levenshtein_ratio',
      contribution: Math.round(levContrib),
      detail: isPrefixMatch 
        ? `Prefix: "${shorterStr}" ⊂ "${longerStr}"`
        : `Levenshtein ${(levRatio * 100).toFixed(0)}%`,
    });
  }

  // First Token Match (very important for Brazilian names)
  totalWeight += WEIGHTS.first_token_match;
  if (nameA.firstToken === nameB.firstToken) {
    weightedSum += WEIGHTS.first_token_match;
    evidence.push({
      feature: 'first_token_match',
      contribution: WEIGHTS.first_token_match,
      detail: `First: ${nameA.firstToken}`,
    });
  }

  // Prefix Containment (any token in A is prefix of any token in B or vice versa)
  totalWeight += WEIGHTS.prefix_containment;
  let prefixMatches = 0;
  for (const ta of nameA.tokens) {
    for (const tb of nameB.tokens) {
      if (ta.length >= 3 && tb.length >= 3) {
        if (tb.startsWith(ta) || ta.startsWith(tb)) {
          prefixMatches++;
        }
      }
    }
  }
  const prefixRatio = Math.min(1, prefixMatches / Math.max(1, nameA.tokens.length));
  const prefixContrib = prefixRatio * WEIGHTS.prefix_containment;
  weightedSum += prefixContrib;
  if (prefixMatches > 0) {
    evidence.push({
      feature: 'prefix_containment',
      contribution: Math.round(prefixContrib),
      detail: `${prefixMatches} prefix matches`,
    });
  }

  // Normalize to 0-100
  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

  return { score, evidence };
}

// =============================================================================
// CONFIDENCE CLASSIFICATION
// =============================================================================

export function classifyConfidence(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.exact) return 'exact';
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.low) return 'low';
  return 'none';
}

// =============================================================================
// BLOCKING INDEX
// =============================================================================

export function buildIndex(persons: Array<{ id: string; name: string; cpf?: string; matricula?: number }>): BlockingIndex {
  const byFirstToken = new Map<string, IndexedPerson[]>();
  const byLastToken = new Map<string, IndexedPerson[]>();
  const byPrefix = new Map<string, IndexedPerson[]>();
  const all: IndexedPerson[] = [];

  for (const p of persons) {
    const normalized = normalizeName(p.name);
    const indexed: IndexedPerson = {
      id: p.id,
      name: normalized,
      cpf: p.cpf,
      matricula: p.matricula,
    };
    all.push(indexed);

    // Index by first token
    if (normalized.firstToken) {
      const existing = byFirstToken.get(normalized.firstToken) || [];
      existing.push(indexed);
      byFirstToken.set(normalized.firstToken, existing);
    }

    // Index by last token
    if (normalized.lastToken) {
      const existing = byLastToken.get(normalized.lastToken) || [];
      existing.push(indexed);
      byLastToken.set(normalized.lastToken, existing);
    }

    // Index by 3-char prefix of each token (for truncated name matching)
    for (const token of normalized.tokens) {
      if (token.length >= 3) {
        const prefix = token.substring(0, 3);
        const existing = byPrefix.get(prefix) || [];
        if (!existing.includes(indexed)) {
          existing.push(indexed);
          byPrefix.set(prefix, existing);
        }
      }
    }
  }

  return { byFirstToken, byLastToken, byPrefix, all };
}

// =============================================================================
// FIND MATCHES
// =============================================================================

export function findMatches(
  rawName: string,
  index: BlockingIndex,
  options: { topK?: number; minScore?: number; cpf?: string } = {}
): IdentityMatch[] {
  const { topK = 5, minScore = 30, cpf } = options;
  const queryName = normalizeName(rawName);

  if (!queryName.normalized) {
    return [];
  }

  // Get candidates via blocking (union of multiple strategies)
  const candidateSet = new Set<IndexedPerson>();
  
  // Strategy 1: First token exact match
  if (queryName.firstToken) {
    const firstMatches = index.byFirstToken.get(queryName.firstToken) || [];
    firstMatches.forEach(p => candidateSet.add(p));
  }
  
  // Strategy 2: Last token exact match
  if (queryName.lastToken) {
    const lastMatches = index.byLastToken.get(queryName.lastToken) || [];
    lastMatches.forEach(p => candidateSet.add(p));
  }

  // Strategy 3: Prefix match for all tokens (catches truncated names)
  for (const token of queryName.tokens) {
    if (token.length >= 3) {
      const prefix = token.substring(0, 3);
      const prefixMatches = index.byPrefix.get(prefix) || [];
      prefixMatches.forEach(p => candidateSet.add(p));
    }
  }

  // If still no candidates, fallback to all
  const candidates = candidateSet.size > 0 ? Array.from(candidateSet) : index.all;

  // Score all candidates
  const results: IdentityMatch[] = [];
  
  for (const candidate of candidates) {
    const { score, evidence } = scoreMatch(queryName, candidate.name, cpf, candidate.cpf);
    
    if (score >= minScore) {
      results.push({
        candidateId: candidate.id,
        candidateName: candidate.name.original,
        score,
        confidence: classifyConfidence(score),
        evidence,
      });
    }
  }

  // Sort by score descending, take top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

// =============================================================================
// CONVENIENCE: SINGLE BEST MATCH
// =============================================================================

export function findBestMatch(
  rawName: string,
  index: BlockingIndex,
  cpf?: string
): IdentityMatch | null {
  const matches = findMatches(rawName, index, { topK: 1, cpf });
  return matches.length > 0 ? matches[0] : null;
}

// =============================================================================
// BATCH RESOLUTION
// =============================================================================

export interface ResolutionResult {
  input: string;
  match: IdentityMatch | null;
  alternatives: IdentityMatch[];
}

export function resolveIdentities(
  names: Array<{ name: string; cpf?: string }>,
  index: BlockingIndex
): ResolutionResult[] {
  return names.map(({ name, cpf }) => {
    const matches = findMatches(name, index, { topK: 3, cpf });
    return {
      input: name,
      match: matches.length > 0 && matches[0].confidence !== 'none' ? matches[0] : null,
      alternatives: matches.slice(1),
    };
  });
}

