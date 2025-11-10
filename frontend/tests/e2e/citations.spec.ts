import { test, expect } from '@playwright/test';

test.describe('Citations and Source Viewer', () => {

    test('should show citations in chatbot response and open source viewer', async ({ page }) => {
        await page.goto('/');

        // 1. Upload a document first to ensure we have context
        const timestamp = Date.now();
        const filename = `citation-test-${timestamp}.txt`;
        const content = 'The secret password for this test is BLUE_PANDA_123.';

        const buffer = Buffer.from(content);
        const file = {
            name: filename,
            mimeType: 'text/plain',
            buffer,
        };

        const uploadResponsePromise = page.waitForResponse(response =>
            response.url().includes('/upload') && response.status() === 200
        );
        const listRefreshPromise = page.waitForResponse(response =>
            response.url().includes('/documents') && response.request().method() === 'GET' && response.status() === 200
        );

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(file);

        await uploadResponsePromise;
        await listRefreshPromise;

        // 2. Ask a question about the document
        await page.getByPlaceholder('Message AI Architect...').fill('What is the secret password?');

        const streamResponsePromise = page.waitForResponse(response =>
            response.url().includes('/chat/stream') && response.status() === 200
        );

        await page.getByRole('button', { name: 'Send message' }).click();
        await streamResponsePromise;

        // 3. Wait for the response to contain the citation [1]
        // We use a broader locator and wait for text to appear
        const assistantMessage = page.locator('.bg-assistant'); // This class might not be there, checking chat-message.tsx...
        // Actually ChatMessage uses conditional classes but we can look for the citation button

        await expect(page.locator('button:has-text("1")')).toBeVisible({ timeout: 20000 });

        // 4. Click the citation
        const citationBtn = page.locator('button:has-text("1")').first();
        await expect(citationBtn).toBeVisible();
        await citationBtn.click();

        // 5. Verify Source Viewer opens
        await expect(page.getByText(/Source \[1\]/)).toBeVisible();
        const sourceContent = page.getByTestId('source-content');
        await expect(sourceContent).toBeVisible();
        await expect(sourceContent).toContainText('BLUE_PANDA_123');

        // 6. Close Source Viewer
        await page.getByText('Close Preview').click();
        await expect(page.getByText(/Source \[1\]/)).not.toBeVisible();
    });
});
