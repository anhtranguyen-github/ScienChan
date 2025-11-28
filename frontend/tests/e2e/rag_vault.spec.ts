import { test, expect } from '@playwright/test';

test.describe('RAG & Vault E2E', () => {


    test('should handle global vault deletion', async ({ page }) => {
        test.setTimeout(60000);
        // 1. Go to Documents
        await page.goto('/documents');

        // Wait for docs to load
        await page.waitForResponse(res => res.url().includes('/documents-all') && res.status() === 200);
        await page.waitForTimeout(1000); // Settle UI

        // Locate first document
        const firstDoc = page.locator('tbody tr').first();
        const docNameEl = firstDoc.getByTestId('doc-name');

        // Ensure at least one doc exists
        if (await docNameEl.count() === 0) {
            console.log("No documents found to delete, skipping deletion test logic.");
            return;
        }

        await expect(docNameEl).toBeVisible();
        const docName = await docNameEl.innerText();

        // Click delete
        await page.getByTestId(`delete-doc-${docName}`).click();

        // Verify Modal is open
        await expect(page.getByText('Delete Document?')).toBeVisible();

        // Toggle Vault Purge
        await page.getByTestId('vault-purge-toggle').click();

        // Confirm
        const deletePromise = page.waitForResponse(res => res.url().includes(`/documents/${docName}`) && res.request().method() === 'DELETE' && res.status() === 200);
        await page.getByTestId('confirm-purge-btn').click();

        await deletePromise;

        // Verify it's gone from UI
        await expect(page.getByText(docName)).not.toBeVisible();
    });
});
