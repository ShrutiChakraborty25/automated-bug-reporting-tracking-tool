const { test, expect } = require("@playwright/test");

test("home page should load successfully", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Bug Tracking Demo Application");

    await expect(
        page.getByRole("heading", {
            name: "Bug Tracking Demo Application"
        })
    ).toBeVisible();

    await expect(
        page.getByRole("button", {
            name: "Login"
        })
    ).toBeVisible();
});