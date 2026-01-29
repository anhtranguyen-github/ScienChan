# Test Constraints & Known Issues Register

## 1. Testing Constraints

### 🚫 STRICTLY FORBIDDEN: Arbitrary `setTimeout`
**Do not use `await page.waitForTimeout(N)`** within E2E tests unless absolutely necessary for debugging.
*   ❌ `await page.waitForTimeout(3000)`
*   ✅ `await expect(locator).toBeVisible()`
*   ✅ `await page.waitForResponse(r => ...)`

### 👁️ Assert Observable Behavior (UI), Not Logic
Playwright asserts what the user **sees**, not internal state or invisible URLs.
*   ❌ `await expect(page).toHaveURL('/learn/session')` (This is opaque)
*   ✅ `await expect(page.getByTestId('learning-session-root')).toBeVisible()` (This is the Source of Truth)
*   **Agent Rule:** If a URL assertion fails, assume the URL is a side-effect and switch to asserting a unique UI element.

### ⚓ Redirects Must Have Anchors
Redirects are side-effects of API calls or state changes. You must wait for the meaningful trigger.
*   ✅ Wait for API: `await page.waitForResponse(r => r.url().includes('/api/session') && r.status() === 200)`
*   ✅ Wait for Element: `await expect(page.getByText('Discovery Batch')).toBeVisible()`
*   ❌ Do not assert URL change if you haven't confirmed the trigger completed.

### 📜 BeforeEach Limitations
*   `beforeEach` should only handle basic setup (login, routing).
*   **Do NOT** include complex logic (creating sessions, fetching curriculum) in `beforeEach`.
*   **Agent Rule:** If `beforeEach` exceeds 30 lines or 30s logic, move it to the test body.

### 🎯 One Intention Per Test
*   ❌ `test('full learning flow', ...)` (Too long/brittle)
*   ✅ `test('enter learning session', ...)`
*   ✅ `test('answer quiz item', ...)`
*   **Agent Rule:** Split tests > 200 lines.

### 🆔 Use `data-testid` Contracts
*   ❌ Avoid `className`, dynamic text, or deep path selectors.
*   ✅ Use `data-testid="quiz-question"` and `page.getByTestId('quiz-question')`.
*   **Agent Rule:** If a selector is unstable, **add** a `data-testid` to the codebase instead of writing a complex generic selector.
*   **Contract:** For quiz/review automatization, use `data-testid="debug-answer"` as an attached (but invisible) anchor to retrieve the correct answer without visual interference.

### 🧩 Logic Synchronization
*   If an element is intentionally invisible (e.g. `opacity-0` for automation), use `await expect(locator).toBeAttached()` instead of `toBeVisible()`.
*   In loops, use `await locator.count() > 0` to check for presence, as it's more stable than `isVisible()` for rapid state transitions.

### 🌐 Network is the Source of Truth for Async
*   If the UI depends on backend/service calls (client-side), wait for the network response explicitly if the UI doesn't have a clear immediate loading state.
*   `await page.waitForResponse(...)` can prevent flakes where the UI hasn't reacted to the data yet.

### 🎭 No Style/Animation Testing
*   ❌ `expect(opacity).toBe(1)`
*   ✅ `expect(locator).toBeVisible()`

### 🧪 Independent Tests
*   Each test must be atomic. Login separately, seed separately.
*   Do not rely on state from Test A in Test B.

### ⚠️ No Blind Auto-Fixing
*   **Order of Operations for Agents:**
    1.  Log Current URL & Page State.
    2.  Check Network Calls (failures/timeouts).
    3.  Check Element Visibility (`await page.pause()` inspection).
    4.  **Only then** adjust the assertion.
*   **Forbidden:** Increasing timeouts blindly, adding sleeps, or commenting out failing tests.

---

## 2. Fixed Bug Register & Solutions

### 🐛 Bug: Dashboard Infinite Loading / White Screen
*   **Symptoms:** Dashboard stuck on "Loading...", E2E timeout.
*   **Root Cause:** Error in `refreshData` was caught but `setStats` was never called, leaving `stats` null.
*   **✅ Fix:** Call `setStats(fallback)` within the `catch` block.

### 🐛 Bug: Learning Session "Quiz Loop" Timeout
*   **Symptoms:** Test stuck answering "test" forever.
*   **Root Cause:** Brittle selector for "Next Item" button missed variations like "Got it, Continue".
*   **✅ Fix:** Use regex selector: `page.getByRole('button', { name: /Next Item|Got it, Continue/ })`.

### 🐛 Bug: Duplicate Component Exports
*   **Symptoms:** Build fail "Module has no exported member".
*   **Root Cause:** AI appended duplicate code to the end of file.
*   **✅ Fix:** Verify file tail after matching.

### 🐛 Bug: Review Session synchronization failure
*   **Symptoms:** `toBeVisible` failed on `debug-answer`.
*   **Root Cause:** The element was too small/transparent for Playwright's "visible" definition.
*   **✅ Fix:** Use `toBeAttached()` and check for `count() > 0`.
