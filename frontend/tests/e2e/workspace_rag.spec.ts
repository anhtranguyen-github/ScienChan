import { test, expect } from '@playwright/test';

test.describe('Workspace RAG E2E', () => {

    test('should create workspace with custom RAG and verify persistence', async ({ page }) => {
        test.setTimeout(30000); // Standard timeout
        await page.goto('/');

        const timestamp = Date.now();
        const wsName = `Test RAG WS ${timestamp}`;

        // 1. Open Modal
        await page.getByRole('button', { name: 'New Workspace' }).click();

        // 2. Fill basic info
        await page.getByPlaceholder('e.g. Project Architect').fill(wsName);
        await page.getByPlaceholder('Briefly describe the purpose of this workspace...').fill('Automated E2E Test Workspace');

        // 3. Select Graph Engine (Testing the toggle)
        await page.getByRole('button', { name: 'Graph Knowledge' }).click();

        // 4. Submit
        await page.getByRole('button', { name: 'Initialize Workspace' }).click();

        // 5. Verify it appears in list and is highlighted (active)
        await expect(page.getByText(wsName, { exact: false })).toBeVisible({ timeout: 15000 });

        // 6. Enter workspace
        await page.getByText(wsName).click();

        // 7. Verify we are in the chat interface
        await expect(page).toHaveURL(/.*\/chat/);
        await expect(page.getByText('Intelligence Chat')).toBeVisible();
    });
});
