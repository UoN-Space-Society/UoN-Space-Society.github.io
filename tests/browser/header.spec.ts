import { test, expect } from '@playwright/test';

for (const width of [1440, 1200, 900, 650, 390, 350]) {
  test(`navigation keeps the landing page dimensions at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });

    const routes = [
      '/',
      '/projects.html',
      '/projects/helia.html',
      '/sponsors.html',
      '/contact.html',
    ];
    let landingLayout: unknown;

    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.locator('header').evaluate((header) => {
        const bounds = header.getBoundingClientRect();
        const measure = (selector: string) => {
          const element = header.querySelector(selector)!;
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            x: Math.round((box.x - bounds.x) * 100) / 100,
            y: Math.round((box.y - bounds.y) * 100) / 100,
            width: box.width,
            height: box.height,
            fontSize: style.fontSize,
          };
        };
        return {
          width: bounds.width,
          height: bounds.height,
          logo: measure('.brand img'),
          links: measure('.desktop-nav'),
          social: measure('.social-links'),
          menu: measure('.mobile-menu'),
        };
      });

      if (route === '/') landingLayout = layout;
      else
        expect(layout, `${route} should match the landing header`).toEqual(
          landingLayout,
        );

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
