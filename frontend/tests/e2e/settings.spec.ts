import { test, expect } from '@playwright/test';

test.describe('Workspace Settings', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible({ timeout: 15000 });
        await page.getByText('Default Workspace').click();
        await page.waitForLoadState('networkidle');
    });

    test('should navigate to settings page', async ({ page }) => {
        await page.getByRole('link', { name: 'Settings' }).click();
        await expect(page).toHaveURL(/.*\/kernel/);
    });

    test('should show settings manager on kernel page', async ({ page }) => {
        await page.getByRole('link', { name: 'Settings' }).click();

        // Kernel page should have system diagnostics and settings
        await expect(page.getByText(/System|Diagnostics|Configuration|Settings/i)).toBeVisible({ timeout: 10000 });
    });

    test('should display current workspace context in settings', async ({ page }) => {
        await page.getByRole('link', { name: 'Settings' }).click();

        // Should maintain workspace context
        const header = page.locator('button[title="Switch Workspace"]');
        await expect(header).toContainText('Default Workspace');
    });
});

test.describe('Settings Modal Flow', () => {
    test('should be accessible from workspace kernel page', async ({ page }) => {
        await page.goto('/');
        await page.getByText('Default Workspace').click();
        await page.waitForLoadState('networkidle');
        await page.getByRole('link', { name: 'Settings' }).click();

        // Kernel page content should be visible
        await expect(page).toHaveURL(/.*\/kernel/);
    });
});
