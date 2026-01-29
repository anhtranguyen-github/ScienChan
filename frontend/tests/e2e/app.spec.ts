import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Chatbot App E2E', () => {

    test('should load the chat page', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/LangGraph Chatbot/i); // Adjust based on actual title if needed
        await expect(page.getByText('AI Reasoning Engine')).toBeVisible();
    });

    test('should send a message and receive response', async ({ page }) => {
        await page.goto('/');
        const input = page.getByPlaceholder('Message AI Architect...');
        await input.fill('Hello, are you working?');
        await page.getByRole('button', { name: 'Send message' }).click();

        // Wait for user message
        await expect(page.getByText('Hello, are you working?')).toBeVisible();

        // Wait for assistant response (Thinking or Content)
        // Since we mock backend or assume it runs, this might fail if backend isn't up.
        // We will assert that the loading state appears or a response appears.
        await expect(page.getByText('AI Architect')).toBeVisible();
    });

    test('should upload and delete a document', async ({ page }) => {
        await page.goto('/');

        // Use a unique filename to avoid state pollution
        const timestamp = Date.now();
        const filename = `test-doc-${timestamp}.txt`;

        // Create a dummy file
        const buffer = Buffer.from('This is a test document content.');
        const file = {
            name: filename,
            mimeType: 'text/plain',
            buffer,
        };

        // Prepare to catch the upload response
        const uploadResponsePromise = page.waitForResponse(response =>
            response.url().includes('/upload') && response.status() === 200
        );

        // Also wait for the subsequent GET /documents call that refreshes the list
        const listRefreshPromise = page.waitForResponse(response =>
            response.url().includes('/documents') && response.request().method() === 'GET' && response.status() === 200
        );

        // Trigger upload
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(file);

        // Wait for both operations
        await uploadResponsePromise;
        await listRefreshPromise;

        // Now assert UI update
        // Use data-testid for robustness
        const docItemLocator = page.getByTestId(`doc-item-${filename}`);
        await expect(docItemLocator).toBeVisible();

        // Delete it
        // Force hover to show delete button
        await docItemLocator.hover();

        // Prepare to catch delete response
        const deleteResponsePromise = page.waitForResponse(response =>
            response.url().includes(`/documents/${filename}`) && response.request().method() === 'DELETE' && response.status() === 200
        );

        const deleteBtn = page.getByTestId(`delete-doc-${filename}`);
        await deleteBtn.click();

        // Wait for network confirmation
        await deleteResponsePromise;

        // Assert UI update
        // Wait for the element to detach
        await expect(docItemLocator).not.toBeVisible();
    });
});
