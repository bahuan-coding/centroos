/**
 * Organization state management for multi-tenant support
 * Stores selected organization in localStorage and provides helpers
 */

import { Organization, ORGANIZATIONS, getOrganizationById, getDefaultOrganization } from './organizations';

const STORAGE_KEY = 'selected_org_id';

/**
 * Get the currently selected organization
 */
export function getOrg(): Organization | null {
  const orgId = localStorage.getItem(STORAGE_KEY);
  if (!orgId) return null;
  return getOrganizationById(orgId) || null;
}

/**
 * Get the current organization ID (for API calls)
 */
export function getOrgId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Set the selected organization by ID
 */
export function setOrg(orgId: string): Organization | null {
  const org = getOrganizationById(orgId);
  if (!org) {
    console.warn(`Organization with id ${orgId} not found`);
    return null;
  }
  localStorage.setItem(STORAGE_KEY, orgId);
  return org;
}

/**
 * Clear the selected organization (internal use only - logout)
 * Not exported to prevent unauthorized org switching within the app
 */
function clearOrg(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clear org on logout - the only authorized way to reset org selection
 */
export function clearOrgOnLogout(): void {
  clearOrg();
}

/**
 * Check if an organization is selected
 */
export function hasOrg(): boolean {
  return getOrg() !== null;
}

/**
 * Get all available organizations
 */
export function getAvailableOrgs(): Organization[] {
  return ORGANIZATIONS;
}

/**
 * Get the current organization code for API calls (multi-tenant NFS-e)
 * Returns the nfseEnvPrefix if configured, otherwise the org code
 */
export function getOrgCode(): string | undefined {
  const org = getOrg();
  return org?.nfseEnvPrefix || org?.code;
}

/**
 * Set default organization if none selected
 */
export function ensureOrg(): Organization {
  const current = getOrg();
  if (current) return current;
  
  const defaultOrg = getDefaultOrganization();
  setOrg(defaultOrg.id);
  return defaultOrg;
}

// Re-export types for convenience
export type { Organization, OrgType } from './organizations';
