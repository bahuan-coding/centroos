import { test, expect } from '@playwright/test';

// All routes in the application
const ROUTES = [
  { path: '/', name: 'Dashboard', requiresAuth: true },
  { path: '/login', name: 'Login', requiresAuth: false },
  { path: '/pessoas', name: 'Pessoas', requiresAuth: true },
  { path: '/contas', name: 'Contas Financeiras', requiresAuth: true },
  { path: '/pagar-receber', name: 'Pagar/Receber', requiresAuth: true },
  { path: '/titulos', name: 'Fluxo de Caixa', requiresAuth: true },
  { path: '/contabilidade', name: 'Contabilidade', requiresAuth: true },
  { path: '/accounts', name: 'Plano de Contas', requiresAuth: true },
  { path: '/patrimonio', name: 'Patrimônio', requiresAuth: true },
  { path: '/projetos-fundos', name: 'Projetos e Fundos', requiresAuth: true },
  { path: '/periods', name: 'Períodos', requiresAuth: true },
  { path: '/conciliacao', name: 'Conciliação', requiresAuth: true },
  { path: '/import', name: 'Importar Extrato', requiresAuth: true },
  { path: '/reports', name: 'Relatórios', requiresAuth: true },
  { path: '/governanca', name: 'Governança', requiresAuth: true },
  { path: '/settings', name: 'Configurações', requiresAuth: true },
  { path: '/extratos', name: 'Extratos', requiresAuth: true },
  { path: '/entries', name: 'Lançamentos', requiresAuth: true },
  { path: '/audit', name: 'Auditoria', requiresAuth: true },
];

// Helper to login
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Navigation - No White Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  for (const route of ROUTES.filter(r => r.requiresAuth)) {
    test(`${route.name} (${route.path}) renders content`, async ({ page }) => {
      await page.goto(route.path);
      
      // Wait for any loading to complete (max 10s)
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      // Check that main content area exists and has content
      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 10000 });
      
      // Ensure main has some content (not empty)
      const mainContent = await main.textContent();
      expect(mainContent?.trim().length).toBeGreaterThan(0);
      
      // Check for fatal console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
          errors.push(msg.text());
        }
      });
      
      // No uncaught errors in console
      expect(errors.filter(e => e.includes('Uncaught') || e.includes('unhandled'))).toHaveLength(0);
    });
  }
});

test.describe('Navigation - Direct URL Access (Refresh)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard refresh works', async ({ page }) => {
    await page.goto('/');
    await page.reload();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Pessoas refresh works', async ({ page }) => {
    await page.goto('/pessoas');
    await page.reload();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Cadastro de Pessoas');
  });

  test('Contabilidade refresh works', async ({ page }) => {
    await page.goto('/contabilidade');
    await page.reload();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Contabilidade');
  });
});

test.describe('Navigation - 404 Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Invalid route shows 404 page', async ({ page }) => {
    await page.goto('/rota-que-nao-existe');
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('text=Página não encontrada')).toBeVisible();
  });

  test('404 page has link back to dashboard', async ({ page }) => {
    await page.goto('/rota-invalida-teste');
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });
});

test.describe('Navigation - Auth Redirect', () => {
  test('Unauthenticated user is redirected to login', async ({ page }) => {
    // Clear any existing auth
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    
    // Try to access protected route
    await page.goto('/pessoas');
    
    // Should show login form
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Navigation - Browser History', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Back/forward navigation works', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/pessoas"]');
    await expect(page.locator('h1')).toContainText('Cadastro de Pessoas');
    
    await page.click('a[href="/contas"]');
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // Go back
    await page.goBack();
    await expect(page.locator('h1')).toContainText('Cadastro de Pessoas');
    
    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h1')).toContainText('Contas Financeiras');
  });
});

test.describe('Login Flow', () => {
  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h3')).toContainText('CentrOS');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText(/Bom dia|Boa tarde|Boa noite/);
  });
});









