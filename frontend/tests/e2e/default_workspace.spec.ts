import { test, expect } from '@playwright/test';

test.describe('Default Workspace E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/workspaces');
    });

    test('should show default workspace in the list', async ({ page }) => {
        // Look for the default workspace
        // Our service names it "Default Workspace"
        await expect(page.getByText('Default Workspace')).toBeVisible();
    });

    test('should prevent editing default workspace', async ({ page }) => {
        // Find the card by its ID text
        const defaultCard = page.locator('div.bg-\\[\\#121214\\]').filter({ hasText: 'ID: default' });

        // Find the edit button inside that card
        const editButton = defaultCard.getByTitle('System workspace cannot be edited');

        await expect(editButton).toBeVisible();
        await expect(editButton).toBeDisabled();
    });

    test('should prevent deleting default workspace', async ({ page }) => {
        // Find the card by its ID text
        const defaultCard = page.locator('div.bg-\\[\\#121214\\]').filter({ hasText: 'ID: default' });

        // Find the delete button inside that card
        const deleteButton = defaultCard.getByTitle('Delete');

        await expect(deleteButton).toBeDisabled();
    });

    test('should be able to switch to default workspace', async ({ page }) => {
        // Go to dashboard
        await page.goto('/');

        // Open switcher - find the button that contains a workspace name or the word 'Workspace'
        // We look for the button containing the blue icon box
        const switcherButton = page.locator('button').filter({ has: page.locator('div.bg-blue-600') });
        await switcherButton.click();

        // Click on Default Workspace
        await page.getByText('Default Workspace').click();

        // Verify switcher shows Default Workspace
        await expect(page.getByRole('button', { name: 'Default Workspace' })).toBeVisible();
    });
});
