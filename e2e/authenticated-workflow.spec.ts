import { expect, test } from "@playwright/test";

const authenticated = Boolean(process.env.E2E_STORAGE_STATE);

test.describe("authenticated teacher workflow", () => {
  test.skip(!authenticated, "Set E2E_STORAGE_STATE to a dedicated Google-authenticated teacher session.");

  test("creates a missing assignment through canonical lesson selection and persists through export", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /good (morning|afternoon|evening)/i })).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Canonical subject assignments" })).toBeVisible();
    const settingsClassSelect = page.getByLabel("Class and section");
    await expect(settingsClassSelect).toBeVisible();
    await expect(page.getByLabel("Verified subject")).toBeDisabled();
    await settingsClassSelect.selectOption({ index: 1 });
    const settingsSubjectSelect = page.getByLabel("Verified subject");
    await expect(settingsSubjectSelect).toBeEnabled();

    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "Create lesson" })).toBeVisible();
    const classSelect = page.getByLabel("Class and section");
    await classSelect.selectOption({ index: 1 });
    const subjectSelect = page.getByLabel("Subject");
    await expect(subjectSelect).toBeEnabled();
    await subjectSelect.selectOption({ index: 1 });
    const bookSelect = page.getByLabel("Book");
    await expect(bookSelect).toBeEnabled();
    await bookSelect.selectOption({ index: 1 });
    const chapterSelect = page.getByLabel("Chapter");
    await expect(chapterSelect).toBeEnabled();
    await chapterSelect.selectOption({ index: 1 });
    const topicSelect = page.getByLabel("Topic / subtopic");
    await expect(topicSelect).toBeEnabled();
    await topicSelect.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Generate lesson plan" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText(/verified teaching assignment.*saved/i)).toBeVisible();
    await page.getByRole("button", { name: "Create" }).click();

    const sequence = page.getByLabel(/teaching action/i).first();
    await sequence.fill("Updated in authenticated E2E coverage.");
    await page.reload();
    await page.getByRole("button", { name: "My Plans" }).click();
    await page.getByRole("button", { name: /^Open / }).first().click();
    await expect(page.getByText("Updated in authenticated E2E coverage.")).toBeVisible();
    await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Official PDF" }).click()]);
    await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "DOCX" }).click()]);
  });
});
