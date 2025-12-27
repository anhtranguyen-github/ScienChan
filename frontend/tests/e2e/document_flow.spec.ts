import { test, expect } from '@playwright/test';

test.describe('Document Flow E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Enter default workspace
        await page.goto('/');
        await page.getByText('Default Workspace').click();
        await expect(page).toHaveURL(/.*\/workspaces\/default/);
    });

    test('should show documents page', async ({ page }) => {
        await page.getByRole('link', { name: 'Documents' }).click();
        await expect(page).toHaveURL(/.*\/documents/);
        await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    });

    test('should have upload button', async ({ page }) => {
        await page.getByRole('link', { name: 'Documents' }).click();
        await expect(page.getByRole('button', { name: /Upload Document/ })).toBeVisible();
    });

    test('should have search and filter controls', async ({ page }) => {
        await page.getByRole('link', { name: 'Documents' }).click();

        // Search input
        await expect(page.getByPlaceholder('Search documents...')).toBeVisible();

        // Status filter
        await expect(page.locator('select')).toBeVisible();
    });

    test('should navigate to document detail when clicked', async ({ page }) => {
        await page.getByRole('link', { name: 'Documents' }).click();

        // Wait for documents to load
        await page.waitForTimeout(1000);

        // If there are documents, click the first one
        const docRows = page.locator('tbody tr');
        const count = await docRows.count();

        if (count > 0) {
            await docRows.first().click();
            // Should navigate to document detail page
            await expect(page).toHaveURL(/.*\/documents\/[a-z0-9]+/);

            // Should show document info sections
            await expect(page.getByText('Basic Information')).toBeVisible();
            await expect(page.getByText('Workspace Context')).toBeVisible();
            await expect(page.getByText('Embedding & RAG Configuration')).toBeVisible();
        }
    });

    test('document detail should show metadata', async ({ page }) => {
        await page.getByRole('link', { name: 'Documents' }).click();
        await page.waitForTimeout(1000);

        const docRows = page.locator('tbody tr');
        const count = await docRows.count();

        if (count > 0) {
            await docRows.first().click();
            await expect(page).toHaveURL(/.*\/documents\/[a-z0-9]+/);

            // Check for metadata labels
            await expect(page.getByText('Filename')).toBeVisible();
            await expect(page.getByText('Owner Workspace')).toBeVisible();
            await expect(page.getByText('Total Chunks')).toBeVisible();
            await expect(page.getByText('Content Hash')).toBeVisible();
        }
    });

    test('should be able to go back from document detail', async ({ page }) => {
        await page.getByRole('link', { name: 'Documents' }).click();
        await page.waitForTimeout(1000);

        const docRows = page.locator('tbody tr');
        const count = await docRows.count();

        if (count > 0) {
            await docRows.first().click();
            await expect(page).toHaveURL(/.*\/documents\/[a-z0-9]+/);

            // Click back button
            await page.locator('button').filter({ has: page.locator('svg') }).first().click();

            // Should be back on documents list
            await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
        }
    });
});
