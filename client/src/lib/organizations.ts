/**
 * Organizations configuration for multi-tenant support
 * Contains both real and demo organizations for testing
 */

export type OrgType = 'tech_company' | 'spiritist_center' | 'generic';

export interface Organization {
  id: string;
  code: string;
  name: string;
  legalName: string;
  taxId: string;
  type: OrgType;
  isDemo: boolean;
}

/**
 * Available organizations
 * - Paycubed: Real organization from database
 * - Demo 2: Mock organization for testing multi-tenant isolation
 */
export const ORGANIZATIONS: Organization[] = [
  {
    id: '4408ed21-65d4-44b9-95fa-b537851e9b99',
    code: 'PAYCUBED',
    name: 'Paycubed',
    legalName: 'Paycubed Stack Financeiro LTDA',
    taxId: '63.552.022/0001-84',
    type: 'tech_company',
    isDemo: false,
  },
  {
    id: 'demo-org-00000000-0000-0000-0000-000000000002',
    code: 'DEMO2',
    name: 'Centro Luz Divina',
    legalName: 'Centro Espírita Luz Divina',
    taxId: '00.000.000/0001-00',
    type: 'spiritist_center',
    isDemo: true,
  },
];

/**
 * Get organization by ID
 */
export function getOrganizationById(id: string): Organization | undefined {
  return ORGANIZATIONS.find((org) => org.id === id);
}

/**
 * Get default organization (first non-demo, or first available)
 */
export function getDefaultOrganization(): Organization {
  return ORGANIZATIONS.find((org) => !org.isDemo) || ORGANIZATIONS[0];
}

