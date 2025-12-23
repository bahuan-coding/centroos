export type OrgType = 'spiritist_center' | 'fintech';

export interface Org {
  id: string;
  type: OrgType;
  displayName: string;
  createdAt: string;
}

const STORAGE_KEY = 'selected_org';

const ORG_CONFIGS: Record<OrgType, Omit<Org, 'id' | 'createdAt'>> = {
  spiritist_center: {
    type: 'spiritist_center',
    displayName: 'Centro Espírita',
  },
  fintech: {
    type: 'fintech',
    displayName: 'Fintech',
  },
};

export function getOrg(): Org | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Org;
  } catch {
    return null;
  }
}

export function setOrg(type: OrgType): Org {
  const org: Org = {
    id: `${type}_${Date.now()}`,
    ...ORG_CONFIGS[type],
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
  return org;
}

export function clearOrg(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasOrg(): boolean {
  return getOrg() !== null;
}

