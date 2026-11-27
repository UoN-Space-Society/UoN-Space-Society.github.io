import { test, expect } from '@playwright/test';

test('Astro pages load Analytics only after consent and preserve the choice across navigation', async ({
  page,
}) => {
  const tagRequests: string[] = [];
  await page.route(
    'https://www.googletagmanager.com/gtag/js**',
    async (route) => {
      tagRequests.push(route.request().url());
      await route.fulfill({ contentType: 'application/javascript', body: '' });
    },
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Accept analytics', exact: true }),
  ).toBeVisible();
  expect(tagRequests).toHaveLength(0);
  await page
    .getByRole('button', { name: 'Accept analytics', exact: true })
    .click();
  await expect.poll(() => tagRequests.length).toBe(1);
  expect(tagRequests[0]).toContain('id=G-5678YGQX46');
  await page.goto('/projects/helia.html');
  await expect.poll(() => tagRequests.length).toBe(2);
  await expect(
    page.getByRole('button', { name: 'Accept analytics', exact: true }),
  ).toBeHidden();
  await page
    .getByRole('button', { name: 'Analytics settings', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reject analytics', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Analytics settings', exact: true }),
  ).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
  expect(tagRequests).toHaveLength(2);
});
