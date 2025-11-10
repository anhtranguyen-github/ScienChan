import { test, expect } from '@playwright/test';

test.describe('Sidebar Redesign', () => {
    test('should show the minimalist sidebar and compact items', async ({ page }) => {
        await page.goto('/');

        // 1. Verify Sidebar Header
        await expect(page.getByText('Architect', { exact: true })).toBeVisible();

        // 2. Verify "New Chat" button icon (the one with Title)
        const newChatBtn = page.getByTitle('New Chat');
        await expect(newChatBtn).toBeVisible();

        // 3. Verify Workspace Switcher
        await expect(page.locator('.w-6.h-6.bg-blue-600')).toBeVisible(); // The new small workspace icon

        // 4. Verify compact Recent Chats section
        await expect(page.getByText('Recent Chats', { exact: true })).toBeVisible();

        // 5. Verify compact Knowledge Base section
        await expect(page.getByText('Knowledge Base', { exact: true })).toBeVisible();
        await expect(page.locator('label:has-text("Upload")')).toBeVisible();

        // 6. Verify refined Footer Profile and Settings
        const footer = page.locator('aside > div').last();
        await expect(footer.getByText('Developer')).toBeVisible();

        // 7. Verify Setting icons
        await expect(page.getByTitle('Workspace Settings')).toBeVisible();
        await expect(page.getByTitle('Global Settings')).toBeVisible();
        await expect(page.getByTitle('Manage Tools')).toBeVisible();
    });
});
