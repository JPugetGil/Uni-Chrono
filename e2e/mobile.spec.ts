import { expect, test } from '@playwright/test';
import { mockApis } from './mocks';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('onboardingDone', '1'));
});

const sheetHeight = (sheet: import('@playwright/test').Locator) =>
  sheet.evaluate((el) => Math.round(el.getBoundingClientRect().height));

test('le volet s’ouvre à mi-hauteur sur une fiche et se replie au retour', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  // Mobile : pas de boutons de zoom, le volet est replié sur son résumé
  await expect(page.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
  const explore = page.getByRole('region', { name: 'Uni-Chrono' });
  await expect(explore).toContainText('6 établissements');
  expect(await sheetHeight(explore)).toBe(68);

  await page.getByRole('combobox', { name: /Rechercher/ }).fill('ecole normale');
  await page.getByRole('listbox').getByRole('option', { name: /ECOLE NORMALE SUPERIEURE DE LYON/ }).click();

  const sheet = page.getByRole('region', { name: "Fiche de l'établissement" });
  await expect(sheet.getByRole('region', { name: 'En 15 min à pied' })).toBeVisible();
  // 46 % de la hauteur : la zone reste visible au-dessus
  await expect.poll(() => sheetHeight(sheet)).toBe(Math.round(844 * 0.46));

  await sheet.getByRole('button', { name: 'Retour' }).click();
  await expect.poll(() => sheetHeight(page.getByRole('region', { name: 'Uni-Chrono' }))).toBe(68);
});

test('la poignée fait passer le volet d’un cran à l’autre', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  const sheet = page.getByRole('region', { name: 'Uni-Chrono' });
  await sheet.getByRole('button', { name: 'Agrandir le panneau' }).click();
  await expect.poll(() => sheetHeight(sheet)).toBe(Math.round(844 * 0.46));
  await sheet.getByRole('button', { name: 'Agrandir le panneau' }).click();
  await expect.poll(() => sheetHeight(sheet)).toBe(844 - 64);
  await expect(sheet.getByRole('heading', { level: 2, name: 'Filtres' })).toBeInViewport();
  await sheet.getByRole('button', { name: 'Réduire le panneau' }).click();
  await expect.poll(() => sheetHeight(sheet)).toBe(68);
});
