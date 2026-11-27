import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Public requirements, deliberately independent of components and CSS classes.
const routes = [
  "/", "/index.html", "/projects.html", "/sponsors.html", "/contact.html",
  ...["esac", "helia", "invictus", "isam", "little-john", "medlab", "nrc", "preburner", "rovin", "sampo", "siderus", "stark", "vector", "vesper", "vigil"].map((slug) => `/projects/${slug}.html`),
];

for (const route of routes) {
  test(`${route} can be opened directly and read without overflow`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page).toHaveTitle(/SpaceSoc|Space Society/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("visitors can discover a project and return to the directory", async ({ page }) => {
  await page.goto("/projects.html");
  await page.getByRole("main").getByRole("link", { name: /Project HELIA/ }).click();
  await expect(page).toHaveURL(/\/projects\/helia\.html$/);
  await expect(page.getByRole("heading", { name: "Project HELIA", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /ALL PROJECTS/ }).click();
  await expect(page).toHaveURL(/\/projects\.html$/);
});

test("mobile navigation supports Escape, focus restoration, and link selection", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Menu|Close/ });
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await toggle.click();
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await navigation.getByRole("link", { name: "The society" }).click();
  await expect(page).toHaveURL(/#about$/);
  await expect(navigation).toBeHidden();
});

test("tablet navigation does not overlap the page", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await page.getByRole("button", { name: /Menu|Close/ }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Contact Us" }).click();
  await expect(page).toHaveURL(/contact\.html$/);
});

test("navigation works when JavaScript is unavailable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
    if (!(await navigation.isVisible())) {
      await page.getByRole("button", { name: /Menu|Close/ }).click();
    }
    await navigation.getByRole("link", { name: "Our projects" }).click();
    await expect(page).toHaveURL(/projects\.html$/);
  } finally {
    await context.close();
  }
});

test("reduced motion keeps hero text visible while scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect(heading).toBeVisible();
  expect(await heading.evaluate((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) < 1) return false;
    }
    return true;
  })).toBe(true);
});

for (const route of ["/", "/projects.html", "/sponsors.html", "/contact.html", "/projects/helia.html"]) {
  test(`${route} meets automated WCAG AA checks`, async ({ page }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  });
}

test("first render uses responsive images and local fonts within a transfer budget", async ({ page }) => {
  const externalFonts: string[] = [];
  page.on("request", (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) externalFonts.push(request.url());
  });
  await page.goto("/");
  const hero = page.getByRole("img", { name: /Students gathered in the snow/ });
  await expect(hero).toHaveAttribute("srcset", /\d+w/);
  await expect(hero).toHaveAttribute("fetchpriority", "high");
  await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const url = await hero.evaluate((img: HTMLImageElement) => img.currentSrc);
  const response = await page.request.get(url);
  expect((await response.body()).byteLength).toBeLessThan(400_000);
  expect(externalFonts).toEqual([]);
});
