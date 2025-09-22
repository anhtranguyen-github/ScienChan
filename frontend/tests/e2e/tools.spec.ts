import { test, expect } from '@playwright/test';

test.describe('Tool Management', () => {

    test('should open tool manager', async ({ page }) => {
        await page.goto('/');
        await page.getByText('Manage Tools').click();
        await expect(page.getByText('Tool Management')).toBeVisible();
        await expect(page.getByText('calculator')).toBeVisible();
    });

    test('should add and delete a custom tool', async ({ page }) => {
        await page.goto('/');
        await page.getByText('Manage Tools').click();

        // Add Tool
        const timestamp = Date.now();
        const toolName = `Custom Tool ${timestamp}`;
        const toolId = `custom-tool-${timestamp}`;

        await page.getByText('Register New Tool').click();
        await page.getByPlaceholder('Tool ID').fill(toolId);
        await page.getByPlaceholder('Name').fill(toolName);
        await page.getByRole('button', { name: 'Register Tool' }).click();

        // Verify loaded
        await expect(page.getByText(toolName)).toBeVisible();

        // Delete Tool
        const toolRow = page.locator('.group', { hasText: toolName });
        await toolRow.hover(); // Show delete button
        // Assuming delete button is the second one in the row actions
        await toolRow.locator('button').last().click();

        // Verify deleted
        await expect(page.getByText(toolName)).not.toBeVisible();
    });
});
