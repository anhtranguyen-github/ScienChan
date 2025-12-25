import { test, expect } from '@playwright/test';

test.describe('Default Workspace E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/workspaces');
    });

    test('should show default workspace in the list', async ({ page }) => {
        // Look for the default workspace
        // Our service names it "Default Workspace"
        await expect(page.getByText('Default Workspace')).toBeVisible({ timeout: 15000 });
    });

    test('should prevent editing default workspace', async ({ page }) => {
        // Find the card by its ID text
        const defaultCard = page.locator('div.group').filter({ hasText: 'ID: default' }).first();

        // Find the edit button inside that card
        const editButton = defaultCard.getByTitle('System workspace cannot be edited');

        await expect(editButton).toBeVisible();
        await expect(editButton).toBeDisabled();
    });

    test('should prevent deleting default workspace', async ({ page }) => {
        // Find the card by its ID text
        const defaultCard = page.locator('div.group').filter({ hasText: 'ID: default' }).first();

        // Find the delete button inside that card
        const deleteButton = defaultCard.getByTitle('System workspace cannot be deleted');

        await expect(deleteButton).toBeDisabled();
    });

    test('should be able to switch to default workspace', async ({ page }) => {
        // First enter any workspace to see the sidebar/switcher
        await page.goto('/workspaces/default');

        // Open switcher
        const switcherButton = page.locator('button').filter({ has: page.locator('div.bg-blue-600') });
        await switcherButton.click();

        // Click on Default Workspace
        await page.getByText('Default Workspace').click();

        // Verify switcher shows Default Workspace
        await expect(page.getByRole('button', { name: 'Default Workspace' })).toBeVisible();
    });
});
