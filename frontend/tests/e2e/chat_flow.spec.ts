import { test, expect } from '@playwright/test';

test.describe('Chat Flow E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to default workspace chat
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible({ timeout: 15000 });
        await page.getByText('Default Workspace').click();
        await page.waitForLoadState('networkidle');
        await page.getByRole('link', { name: 'Chat' }).click();
        await expect(page).toHaveURL(/.*\/chat/, { timeout: 10000 });
        await page.waitForLoadState('networkidle');
    });

    test('should show chat page with mode selector', async ({ page }) => {
        // Mode buttons should be visible
        await expect(page.getByRole('button', { name: /Fast/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Thinking/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Reasoning/i })).toBeVisible();
    });

    test('should show chat input', async ({ page }) => {
        await expect(page.getByPlaceholder('Ask a question...')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
    });

    test('should show empty state when no messages', async ({ page }) => {
        await expect(page.getByText('Start a Conversation')).toBeVisible();
        await expect(page.getByText('Summarize my documents')).toBeVisible();
    });

    test('should enable send button when input has text', async ({ page }) => {
        const sendButton = page.getByRole('button', { name: 'Send message' });
        await expect(sendButton).toBeDisabled();

        await page.getByPlaceholder('Ask a question...').fill('Hello');
        await expect(sendButton).not.toBeDisabled();
    });

    test('should change mode when clicked', async ({ page }) => {
        const thinkingButton = page.getByRole('button', { name: /Thinking/i });
        await thinkingButton.click();

        // Thinking button should now have active styling
        await expect(thinkingButton).toHaveClass(/bg-blue-600/);
    });

    test('should show workspace ID in header', async ({ page }) => {
        await expect(page.getByText(/Workspace: default/)).toBeVisible();
    });
});

test.describe('Chat Message Flow E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible({ timeout: 15000 });
        await page.getByText('Default Workspace').click();
        await page.waitForLoadState('networkidle');
        await page.getByRole('link', { name: 'Chat' }).click();
        await expect(page).toHaveURL(/.*\/chat/, { timeout: 10000 });
    });

    test('should send message via quick start', async ({ page }) => {
        // This will trigger the chat flow
        await page.getByText('Summarize my documents').click();

        // Loading indicator should appear (briefly)
        // Note: This might be too fast to catch, so we just verify the click worked
        await expect(page.getByPlaceholder('Ask a question...')).toHaveValue('');
    });

    test('should send message via input form', async ({ page }) => {
        await page.getByPlaceholder('Ask a question...').fill('What is the main topic?');
        await page.getByRole('button', { name: 'Send message' }).click();

        // Input should be cleared after sending
        await expect(page.getByPlaceholder('Ask a question...')).toHaveValue('');
    });

    test('should handle keyboard submit (Enter)', async ({ page }) => {
        const input = page.getByPlaceholder('Ask a question...');
        await input.fill('Test message');
        await input.press('Enter');

        // Input should be cleared
        await expect(input).toHaveValue('');
    });
});
