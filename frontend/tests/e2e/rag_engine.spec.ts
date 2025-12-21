import { test, expect } from '@playwright/test';

test.describe('Fixed-Mode RAG Engine Creation', () => {
    test('should create a Graph-Aware workspace and show Neo4j config', async ({ page }) => {
        await page.goto('/workspaces');

        // Open creation modal
        await page.click('button:has-text("Create Workspace")');

        // Fill basic details
        const wsName = `Graph E2E ${Math.random().toString(36).substring(7)}`;
        await page.fill('input[placeholder="e.g. Project Alpha"]', wsName);

        // Select Graph-Aware engine
        await page.click('button:has-text("Graph-Aware")');

        // Verify Neo4j config fields are visible
        await expect(page.locator('label:has-text("Neo4j Configuration")')).toBeVisible();
        await page.fill('input[placeholder="bolt://localhost:7687"]', 'bolt://e2e-test:7687');

        // Submit
        await page.click('[data-testid="create-workspace-btn"]');

        // Wait for modal to disappear
        await expect(page.locator('h2:has-text("Create New Workspace")')).toBeHidden();

        // Verify workspace exists in list
        await expect(page.locator(`h3:has-text("${wsName}")`)).toBeVisible();

        // Go to details and verify settings
        const wsCard = page.locator('div.group').filter({ hasText: wsName });
        await wsCard.locator('button[title="View Details"]').click();
        await expect(page).toHaveURL(new RegExp('/workspaces/.*'));

        // Verify engine type label in details (if implemented, otherwise check API or just trust the list)
        // For now, let's just check it doesn't crash
    });

    test('should create a Basic Hybrid workspace by default', async ({ page }) => {
        await page.goto('/workspaces');

        await page.click('button:has-text("Create Workspace")');
        const wsName = `Basic E2E ${Math.random().toString(36).substring(7)}`;
        await page.fill('input[placeholder="e.g. Project Alpha"]', wsName);

        // Neo4j config should be hidden
        await expect(page.locator('label:has-text("Neo4j Configuration")')).not.toBeVisible();

        await page.click('[data-testid="create-workspace-btn"]');
        await expect(page.locator(`h3:has-text("${wsName}")`)).toBeVisible();
    });
});
