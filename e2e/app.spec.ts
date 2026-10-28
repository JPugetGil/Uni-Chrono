import { Page, expect, test } from '@playwright/test';
import { mockApis } from './mocks';

test.beforeEach(async ({ page }) => {
  // Aide au premier usage déjà vue : elle ne masque pas le reste du panneau
  await page.addInitScript(() => localStorage.setItem('onboardingDone', '1'));
});

/** Saisit une recherche et choisit une suggestion */
const searchAndPick = async (page: Page, query: string, option: RegExp) => {
  await page.getByRole('combobox', { name: /Rechercher/ }).fill(query);
  await page.getByRole('listbox').getByRole('option', { name: option }).click();
};

const legendCount = (page: Page, label: string) =>
  page.getByRole('region', { name: 'Légende' }).getByRole('listitem').filter({ hasText: label });

test('charge les établissements et les compte par catégorie', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await expect(legendCount(page, 'Université')).toContainText('4');
  await expect(legendCount(page, 'École spécialisée')).toContainText('2');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Groupe de \d+ établissements|UNIVERSITE DE BRETAGNE/ }).first()).toBeVisible();
});

test('affiche une erreur de chargement et permet de réessayer', async ({ page }) => {
  await mockApis(page, { etablissementsFailures: 1 });
  await page.goto('./');

  await expect(page.getByRole('alert')).toContainText('Impossible de charger les établissements');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect(legendCount(page, 'Université')).toContainText('4');
});

test('recherche un établissement et affiche sa zone, ses bandes et les loyers', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'sciences appliquees', /INSTITUT NATIONAL DES SCIENCES APPLIQUEES/);

  await expect(page.getByRole('heading', { level: 2, name: 'INSTITUT NATIONAL DES SCIENCES APPLIQUEES DE LYON' })).toBeVisible();
  const zone = page.getByRole('region', { name: 'En 15 min à pied' });
  await expect(zone.getByRole('list', { name: 'Temps de trajet' }).getByRole('listitem')).toHaveText(['≤ 5 min', '≤ 10 min', '≤ 15 min']);
  await expect(zone).toContainText('Communes2');
  // Médiane de 16,7 et 16,8 €/m²
  await expect(zone).toContainText('16,8 €/m²');
  expect(isochroneCalls).toEqual([{ profile: 'walking', minutes: [5, 10, 15] }]);

  const housing = page.getByRole('region', { name: 'Se loger dans la zone' });
  const rows = housing.getByRole('list').getByRole('button');
  await expect(rows).toHaveCount(2);
  // Les moins chères d'abord : Caluire (16,7 €/m²) puis Villeurbanne (16,8 €/m²)
  await expect(rows.nth(0)).toContainText('Caluire-et-Cuire');
  await expect(rows.nth(0)).toContainText('≈ 334 €/mois');
  await housing.getByRole('radio', { name: '45 m²' }).check({ force: true });
  await expect(rows.nth(0)).toContainText('≈ 752 €/mois');

  await rows.nth(0).click();
  await expect(rows.nth(0)).toHaveAttribute('aria-pressed', 'true');
});

test('changer la durée depuis la fiche recalcule la zone avec de nouvelles bandes', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'ecole normale', /ECOLE NORMALE SUPERIEURE DE LYON/);
  await expect(page.getByRole('region', { name: 'En 15 min à pied' })).toBeVisible();

  await page.getByRole('radio', { name: '30 minutes' }).check({ force: true });
  await page.getByRole('radio', { name: 'Vélo' }).check({ force: true });

  await expect(
    page.getByRole('region', { name: 'En 30 min à vélo' }).getByRole('list', { name: 'Temps de trajet' }).getByRole('listitem')
  ).toHaveText(['≤ 10 min', '≤ 20 min', '≤ 30 min']);
  expect(isochroneCalls.at(-1)).toEqual({ profile: 'cycling', minutes: [10, 20, 30] });
});

test('les filtres géographiques se complètent en cascade, du haut vers le bas', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');
  await expect(legendCount(page, 'Université')).toContainText('4');

  const region = page.getByLabel('Région', { exact: true });
  const departement = page.getByLabel('Département', { exact: true });
  const ville = page.getByLabel('Ville', { exact: true });

  await region.selectOption('Bretagne');
  await expect(departement.locator('option')).toHaveText(['Tous', 'Finistère (1)', 'Ille-et-Vilaine (2)']);

  await ville.selectOption('Brest');
  await expect(departement).toHaveValue('Finistère');
  await expect(legendCount(page, 'Université')).toContainText('1');

  // Changer de région reste possible et retire département et ville incompatibles
  await region.selectOption('Auvergne-Rhône-Alpes');
  await expect(departement).toHaveValue('');
  await expect(ville).toHaveValue('');
});

test('liste les établissements situés au même endroit', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'rennes', /^Rennes/);
  await page.getByRole('button', { name: 'Groupe de 2 établissements : zoomer' }).click();

  const popup = page.locator('.leaflet-popup');
  await expect(popup).toContainText('2 établissements à cet endroit');
  await popup.getByRole('button', { name: 'UNIVERSITÉ RENNES 2', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'UNIVERSITÉ RENNES 2', exact: true })).toBeVisible();
});

test('une adresse recherchée pose un repère retirable', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'albert einstein', /20 Avenue Albert Einstein/);

  await expect(page.locator('.leaflet-tooltip')).toHaveText('20 Avenue Albert Einstein 69100 Villeurbanne');
  await page.getByRole('button', { name: 'Retirer le repère' }).click();
  await expect(page.locator('.leaflet-tooltip')).toHaveCount(0);
});

test('passe l’interface en anglais', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('combobox', { name: /Search/ })).toHaveAttribute('placeholder', 'Institution, city or address');
  await expect(page).toHaveTitle('Uni-Chrono - University Isochrones');
});

test('un clic sur le fond de carte ou Échap ferme la fiche', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');
  const filters = page.getByRole('heading', { level: 2, name: 'Filtres' });

  await searchAndPick(page, 'ecole normale', /ECOLE NORMALE SUPERIEURE DE LYON/);
  await expect(filters).toHaveCount(0);
  // Coin de carte vide, loin des marqueurs, de la zone et des contrôles
  await page.mouse.click(1380, 820);
  await expect(filters).toBeVisible();

  await searchAndPick(page, 'ecole normale', /ECOLE NORMALE SUPERIEURE DE LYON/);
  await expect(filters).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(filters).toBeVisible();
});

test('la fiche liste les formations Parcoursup et le site web', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'sciences appliquees', /INSTITUT NATIONAL DES SCIENCES APPLIQUEES/);
  await expect(page.getByText('École spécialisée · Public')).toBeVisible();

  await page.getByText('2 formations sur Parcoursup').click();
  const formations = page.locator('details').filter({ hasText: '2 formations sur Parcoursup' }).getByRole('listitem');
  await expect(formations).toHaveCount(2);
  await expect(formations.nth(1)).toContainText('en apprentissage');
  await expect(formations.nth(0).getByRole('link', { name: 'Fiche Parcoursup' })).toHaveAttribute(
    'href',
    'https://dossierappel.parcoursup.fr/fiche?g_ta_cod=1'
  );

  await page.getByText("Fiche de l'établissement").click();
  await expect(page.getByRole('link', { name: 'insa-lyon.fr' })).toHaveAttribute('href', 'https://www.insa-lyon.fr/');
});

test('le filtre de statut et les sources des données', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await page.getByLabel('Statut', { exact: true }).selectOption('prive-contrat');
  await expect(legendCount(page, 'École spécialisée')).toContainText('1');
  await expect(legendCount(page, 'Université')).toContainText('0');

  await page.getByText('Sources des données').click();
  await expect(page.getByRole('link', { name: 'Formations Parcoursup 2026' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Carte des loyers 2025' })).toBeVisible();
  await expect(page.getByText('Données préparées le 26 octobre 2026')).toBeVisible();
});
