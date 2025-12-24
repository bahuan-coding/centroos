/**
 * Mock Provider for development/testing
 * Intercepts API calls and returns mock data when VITE_USE_MOCKS is enabled
 */

import { getMockData, simulateLatency, shouldSimulateError } from './mock-data';
import { getOrgId } from './org';

/**
 * Check if mock mode is enabled
 */
export function isMockModeEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCKS === 'true';
}

/**
 * Mock response wrapper
 */
interface MockResponse<T> {
  data: T;
  isError: boolean;
  error?: string;
}

/**
 * Create a mock response with optional error simulation
 */
async function createMockResponse<T>(
  data: T,
  simulateError = false
): Promise<MockResponse<T>> {
  await simulateLatency();
  
  if (simulateError && shouldSimulateError()) {
    return {
      data: {} as T,
      isError: true,
      error: 'Erro simulado para testes',
    };
  }
  
  return {
    data,
    isError: false,
  };
}

/**
 * Get mock dashboard data for current organization
 */
export async function getMockDashboard() {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');
  
  const mockData = getMockData(orgId);
  return createMockResponse(mockData.dashboard);
}

/**
 * Get mock financial accounts for current organization
 */
export async function getMockFinancialAccounts() {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');
  
  const mockData = getMockData(orgId);
  return createMockResponse(mockData.financialAccounts);
}

/**
 * Get mock chart of accounts for current organization
 */
export async function getMockChartOfAccounts() {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');
  
  const mockData = getMockData(orgId);
  return createMockResponse(mockData.chartOfAccounts);
}

/**
 * Get mock receivables/payables for current organization
 */
export async function getMockReceivablesPayables() {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');
  
  const mockData = getMockData(orgId);
  return createMockResponse(mockData.receivablesPayables);
}

/**
 * Get mock journal entries for current organization
 */
export async function getMockJournalEntries() {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');
  
  const mockData = getMockData(orgId);
  return createMockResponse(mockData.journalEntries);
}

/**
 * Get mock persons for current organization
 */
export async function getMockPersons() {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');
  
  const mockData = getMockData(orgId);
  return createMockResponse(mockData.persons);
}

/**
 * Generic mock data getter
 */
export async function getMockDataByType(type: string) {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');
  
  const mockData = getMockData(orgId);
  
  switch (type) {
    case 'dashboard':
      return createMockResponse(mockData.dashboard);
    case 'financialAccounts':
      return createMockResponse(mockData.financialAccounts);
    case 'chartOfAccounts':
      return createMockResponse(mockData.chartOfAccounts);
    case 'receivablesPayables':
      return createMockResponse(mockData.receivablesPayables);
    case 'journalEntries':
      return createMockResponse(mockData.journalEntries);
    case 'persons':
      return createMockResponse(mockData.persons);
    default:
      return createMockResponse([]);
  }
}

/**
 * Log when using mock mode (for debugging)
 */
export function logMockModeStatus(): void {
  if (isMockModeEnabled()) {
    console.info(
      '%c[Mock Mode] Using mock data provider',
      'background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px;'
    );
  }
}

// Log status on module load
if (typeof window !== 'undefined') {
  logMockModeStatus();
}





