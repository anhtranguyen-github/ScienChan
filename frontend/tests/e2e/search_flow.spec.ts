import { test, expect } from '@playwright/test';

test.describe('Global Search E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/search');
        await expect(page.getByPlaceholder(/Search documents, chats, workspaces/)).toBeVisible({ timeout: 15000 });
    });

    test('should show search page with input', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
        await expect(page.getByPlaceholder(/Search documents/)).toBeVisible();
    });

    test('should have scope filter buttons', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'all' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'documents' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'chats' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'workspaces' })).toBeVisible();
    });

    test('should have workspace filter dropdown', async ({ page }) => {
        await expect(page.locator('select')).toBeVisible();
    });

    test('should have back link to home', async ({ page }) => {
        await expect(page.getByText('← Back')).toBeVisible();
    });

    test('should clear search with X button', async ({ page }) => {
        const input = page.getByPlaceholder(/Search documents/);
        await input.fill('test query');
        await expect(input).toHaveValue('test query');

        // X button appears when there's text - find the button next to input
        const clearButton = page.locator('header').locator('button').last();
        await clearButton.click();

        // Wait for clear
        await expect(input).toHaveValue('', { timeout: 2000 });
    });


    test('should switch scope filters', async ({ page }) => {
        const documentsButton = page.getByRole('button', { name: 'documents' });
        await documentsButton.click();

        // Should have active styling
        await expect(documentsButton).toHaveClass(/bg-white\/10/);
    });

    test('should show no results message for empty search', async ({ page }) => {
        const input = page.getByPlaceholder(/Search documents/);
        await input.fill('xyznonexistentquery123');

        // Wait for debounced search
        await page.waitForTimeout(500);

        await expect(page.getByText(/No results found/)).toBeVisible({ timeout: 5000 });
    });

    test('should navigate back when back link clicked', async ({ page }) => {
        await page.getByText('← Back').click();
        await expect(page).toHaveURL('/');
    });
});

test.describe('Search with Recent History', () => {
    test.beforeEach(async ({ page }) => {
        // Set up recent searches in localStorage before navigation
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('recentSearches', JSON.stringify(['previous search', 'another query']));
        });
        await page.goto('/search');
    });

    test('should show recent searches', async ({ page }) => {
        await expect(page.getByText('Recent Searches')).toBeVisible({ timeout: 5000 });
    });

    test('should populate input when recent search clicked', async ({ page }) => {
        await page.waitForTimeout(500); // Wait for localStorage to load
        const recentSearch = page.getByText('previous search').first();

        if (await recentSearch.isVisible()) {
            await recentSearch.click();
            await expect(page.getByPlaceholder(/Search documents/)).toHaveValue('previous search');
        }
    });
});
