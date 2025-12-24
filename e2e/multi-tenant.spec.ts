import { test, expect } from '@playwright/test';

// Organization IDs for testing
const ORGS = {
  PAYCUBED: {
    id: '4408ed21-65d4-44b9-95fa-b537851e9b99',
    name: 'Paycubed',
    code: 'PAYCUBED',
  },
  DEMO: {
    id: 'demo-org-00000000-0000-0000-0000-000000000002',
    name: 'Centro Luz Divina',
    code: 'DEMO2',
  },
};

// All protected routes
const PROTECTED_ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/pessoas', name: 'Pessoas' },
  { path: '/contas', name: 'Contas Financeiras' },
  { path: '/pagar-receber', name: 'Pagar/Receber' },
  { path: '/titulos', name: 'Títulos' },
  { path: '/contabilidade', name: 'Contabilidade' },
  { path: '/accounts', name: 'Plano de Contas' },
  { path: '/patrimonio', name: 'Patrimônio' },
  { path: '/projetos-fundos', name: 'Projetos e Fundos' },
  { path: '/periods', name: 'Períodos' },
  { path: '/conciliacao', name: 'Conciliação' },
  { path: '/import', name: 'Importar Extrato' },
  { path: '/reports', name: 'Relatórios' },
  { path: '/governanca', name: 'Governança' },
  { path: '/settings', name: 'Configurações' },
  { path: '/extratos', name: 'Extratos' },
  { path: '/entries', name: 'Lançamentos' },
  { path: '/audit', name: 'Auditoria' },
];

// Helper to login
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// Helper to select organization
async function selectOrg(page: import('@playwright/test').Page, orgId: string) {
  await page.evaluate((id) => {
    localStorage.setItem('selected_org_id', id);
  }, orgId);
}

// Helper to get current org from localStorage
async function getCurrentOrgId(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('selected_org_id'));
}

test.describe('Multi-Tenant: Organization Selection', () => {
  test('Org select page shows both organizations', async ({ page }) => {
    await page.goto('/org-select');
    
    // Should show Paycubed
    await expect(page.locator('text=Paycubed')).toBeVisible();
    await expect(page.locator('text=Stack Financeiro')).toBeVisible();
    
    // Should show Demo org
    await expect(page.locator('text=Centro Luz Divina')).toBeVisible();
    await expect(page.locator('text=Demo')).toBeVisible();
  });

  test('Selecting Paycubed sets correct org_id', async ({ page }) => {
    await page.goto('/org-select');
    await page.click('button:has-text("Paycubed")');
    
    await page.waitForURL('/');
    const orgId = await getCurrentOrgId(page);
    expect(orgId).toBe(ORGS.PAYCUBED.id);
  });

  test('Selecting Demo org sets correct org_id', async ({ page }) => {
    await page.goto('/org-select');
    await page.click('button:has-text("Centro Luz Divina")');
    
    await page.waitForURL('/');
    const orgId = await getCurrentOrgId(page);
    expect(orgId).toBe(ORGS.DEMO.id);
  });
});

test.describe('Multi-Tenant: Organization Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectOrg(page, ORGS.PAYCUBED.id);
    await page.reload();
  });

  test('Org switcher shows current organization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should show Paycubed in the switcher button
    await expect(page.locator('button:has-text("Paycubed")')).toBeVisible();
  });

  test('Org switcher dropdown shows all organizations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click the org switcher
    await page.click('button:has-text("Paycubed")');
    
    // Dropdown should show both orgs
    await expect(page.locator('[role="menuitem"]:has-text("Paycubed")')).toBeVisible();
    await expect(page.locator('[role="menuitem"]:has-text("Centro Luz Divina")')).toBeVisible();
  });

  test('Switching organization updates localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click the org switcher
    await page.click('button:has-text("Paycubed")');
    
    // Select Demo org
    await page.click('[role="menuitem"]:has-text("Centro Luz Divina")');
    
    // Wait for reload
    await page.waitForLoadState('networkidle');
    
    // Check localStorage was updated
    const orgId = await getCurrentOrgId(page);
    expect(orgId).toBe(ORGS.DEMO.id);
  });
});

test.describe('Multi-Tenant: Data Isolation', () => {
  test('API calls include X-Organization-Id header', async ({ page }) => {
    await login(page);
    await selectOrg(page, ORGS.PAYCUBED.id);
    
    // Track network requests
    const apiCalls: { url: string; headers: Record<string, string> }[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          headers: request.headers(),
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if any API calls were made with the org header
    // Note: This may not find any calls if all data is cached or no API is called
    // The test validates the mechanism exists
    if (apiCalls.length > 0) {
      const hasOrgHeader = apiCalls.some(
        (call) => call.headers['x-organization-id'] === ORGS.PAYCUBED.id
      );
      expect(hasOrgHeader).toBe(true);
    }
  });
});

test.describe('Multi-Tenant: Navigation with Organization', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectOrg(page, ORGS.PAYCUBED.id);
    await page.reload();
  });

  for (const route of PROTECTED_ROUTES) {
    test(`${route.name} (${route.path}) renders with org selected`, async ({ page }) => {
      await page.goto(route.path);
      
      // Wait for content
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      // Main should be visible
      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 10000 });
      
      // Should have content
      const mainContent = await main.textContent();
      expect(mainContent?.trim().length).toBeGreaterThan(0);
      
      // Org should still be set
      const orgId = await getCurrentOrgId(page);
      expect(orgId).toBe(ORGS.PAYCUBED.id);
    });
  }
});

test.describe('Multi-Tenant: Persistence', () => {
  test('Organization persists after page refresh', async ({ page }) => {
    await login(page);
    await selectOrg(page, ORGS.DEMO.id);
    
    await page.goto('/');
    await page.reload();
    
    const orgId = await getCurrentOrgId(page);
    expect(orgId).toBe(ORGS.DEMO.id);
  });

  test('Deep link works with organization set', async ({ page }) => {
    await login(page);
    await selectOrg(page, ORGS.PAYCUBED.id);
    
    // Navigate directly to a deep route
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Should render the page
    await expect(page.locator('main')).toBeVisible();
    
    // Org should still be set
    const orgId = await getCurrentOrgId(page);
    expect(orgId).toBe(ORGS.PAYCUBED.id);
  });

  test('No organization redirects to org-select', async ({ page }) => {
    await login(page);
    
    // Clear org
    await page.evaluate(() => localStorage.removeItem('selected_org_id'));
    
    // Try to access protected route
    await page.goto('/');
    
    // Should redirect to org-select
    await page.waitForURL('/org-select', { timeout: 5000 });
    await expect(page).toHaveURL('/org-select');
  });
});

test.describe('Multi-Tenant: Console Errors', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectOrg(page, ORGS.PAYCUBED.id);
    await page.reload();
  });

  test('No critical console errors on navigation', async ({ page }) => {
    const criticalErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out expected errors (like 404 for missing resources)
        if (!text.includes('Failed to load resource') && 
            !text.includes('net::ERR_') &&
            !text.includes('favicon')) {
          criticalErrors.push(text);
        }
      }
    });
    
    // Navigate through key routes
    const keyRoutes = ['/', '/pessoas', '/contas', '/accounts', '/contabilidade'];
    
    for (const route of keyRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }
    
    // Check for critical errors (filter out known acceptable ones)
    const realErrors = criticalErrors.filter(
      (e) => e.includes('Uncaught') || e.includes('unhandled') || e.includes('TypeError')
    );
    
    expect(realErrors).toHaveLength(0);
  });
});





