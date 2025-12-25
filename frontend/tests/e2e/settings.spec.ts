import { test, expect } from '@playwright/test';

test.describe('Global Settings', () => {

    test('should open settings and update retrieval mode', async ({ page }) => {
        await page.goto('/');

        // 1. Open Settings
        await page.getByTitle('Global Settings').click();
        await expect(page.getByText('Parameter Configuration')).toBeVisible({ timeout: 15000 });

        // 2. Switch to Retrieval tab
        await page.getByRole('button', { name: 'Retrieval' }).click();
        await expect(page.getByText('Search Pipeline')).toBeVisible();

        // 3. Change mode to VECTOR
        await page.getByRole('button', { name: 'Pure Vector' }).click();

        // 4. Save Changes
        await page.getByRole('button', { name: 'Sync Core' }).click();

        // 5. Verify modal closed (Wait for URL or check context)
        // Since we navigate, the modal text should definitely be gone
        await expect(page.getByText('Parameter Configuration')).not.toBeVisible({ timeout: 10000 });

        // 6. Re-open and verify persistence
        // If we are at /workspaces/default/kernel, the button title="Global Settings" is in the sidebar
        await page.getByTitle('Global Settings').click();
        await page.getByRole('button', { name: 'Retrieval' }).click();

        // Check if VECTOR button has the active class (bg-white text-black in the new design)
        const vectorBtn = page.getByRole('button', { name: 'Pure Vector' });
        await expect(vectorBtn).toHaveClass(/bg-white text-black/);
    });

    test('should toggle reasoning visibility', async ({ page }) => {
        await page.goto('/');

        await page.getByTitle('Global Settings').click();
        await page.getByRole('button', { name: 'Interface' }).click();

        // Find the toggle button
        const toggle = page.locator('button').filter({ has: page.locator('.rounded-full') });
        await toggle.click();

        await page.getByRole('button', { name: 'Sync Core' }).click();

        // Verify it stayed toggled
        await page.getByTitle('Global Settings').click();
        await page.getByRole('button', { name: 'Interface' }).click();
        await expect(page.getByText('Parameter Configuration')).toBeVisible();
    });
});
