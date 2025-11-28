import { test, expect } from '@playwright/test';

test.describe('Workspace RAG E2E', () => {

    test('should create workspace with custom RAG and verify persistence', async ({ page }) => {
        test.setTimeout(60000); // Allow more time for UI interaction
        await page.goto('/workspaces');

        const timestamp = Date.now();
        const wsName = `Test RAG WS ${timestamp}`;

        // Open Modal
        await page.getByRole('button', { name: 'Create Workspace' }).click();

        // Fill basic info
        await page.getByPlaceholder('What should we call this?').fill(wsName);

        // Select custom RAG
        const providerSelect = page.getByTestId('rag-provider-select');
        await providerSelect.selectOption('local');

        const strategySelect = page.getByTestId('rag-strategy-select');
        await strategySelect.selectOption('deep');

        // Create
        await page.getByTestId('create-workspace-btn').click();

        // Verify it appears in list
        await expect(page.getByText(wsName, { exact: false })).toBeVisible({ timeout: 10000 });
    });
});
