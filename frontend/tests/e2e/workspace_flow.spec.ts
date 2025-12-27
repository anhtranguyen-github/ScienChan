import { test, expect } from '@playwright/test';

test.describe('Workspace Flow E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for workspaces to load
        await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible({ timeout: 15000 });
    });

    test('should show workspace list on home page', async ({ page }) => {
        await expect(page.getByText('Default Workspace')).toBeVisible();
    });

    test('should open create workspace modal', async ({ page }) => {
        await page.getByRole('button', { name: 'New Workspace' }).click();
        await expect(page.getByRole('heading', { name: 'Create Workspace' })).toBeVisible();

        // Form elements should be present
        await expect(page.getByPlaceholder('e.g., Project Research')).toBeVisible();
        await expect(page.getByPlaceholder('Optional description...')).toBeVisible();

        // RAG engine options
        await expect(page.getByRole('button', { name: 'Basic' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Graph' })).toBeVisible();
    });

    test('should navigate to workspace overview', async ({ page }) => {
        // Click on default workspace card
        await page.getByText('Default Workspace').click();
        await expect(page).toHaveURL(/.*\/workspaces\/default/, { timeout: 10000 });

        // Should show overview content - the name appears in the header switcher
        await page.waitForLoadState('networkidle');
        const switcherButton = page.locator('button[title="Switch Workspace"]');
        await expect(switcherButton).toContainText('Default Workspace', { timeout: 10000 });
    });


    test('should navigate between workspace sections', async ({ page }) => {
        // Enter default workspace
        await page.getByText('Default Workspace').click();
        await expect(page).toHaveURL(/.*\/workspaces\/default/, { timeout: 10000 });
        await page.waitForLoadState('networkidle');

        // Navigate to Chat
        await page.getByRole('link', { name: 'Chat' }).click();
        await expect(page).toHaveURL(/.*\/chat/);

        // Navigate to Documents
        await page.getByRole('link', { name: 'Documents' }).click();
        await expect(page).toHaveURL(/.*\/documents/);

        // Navigate back to Overview
        await page.getByRole('link', { name: 'Overview' }).click();
        await expect(page).toHaveURL(/.*\/workspaces\/default$/);
    });

    test('should show workspace header with context', async ({ page }) => {
        // Go to workspace
        await page.getByText('Default Workspace').click();
        await page.waitForLoadState('networkidle');

        // Header should have navigation
        await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Chat' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Documents' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

        // Should have exit link
        await expect(page.getByText('Exit Workspace')).toBeVisible();
    });

    test('should be able to exit workspace and return to home', async ({ page }) => {
        // Go to workspace
        await page.getByText('Default Workspace').click();
        await page.waitForLoadState('networkidle');

        // Click exit
        await page.getByText('Exit Workspace').click();

        // Should be back on home page
        await expect(page).toHaveURL('/');
        await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
    });
});
