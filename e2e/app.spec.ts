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

/** Requêtes IGN attendues pour une zone : une par bande */
const ign = (profile: string, minutes: number[]) => minutes.map((m) => ({ profile, minutes: [m] }));

/**
 * Clics rapprochés sur des réglages de trajet (étiquettes des boutons), dans
 * la même tâche : entre deux actions Playwright, la trace peut dépasser l'attente
 */
const clickSettings = (page: Page, labels: string[]) =>
  page.evaluate((names) => {
    for (const name of names) document.querySelector<HTMLInputElement>(`input[type="radio"][aria-label="${name}"]`)?.click();
  }, labels);

const zoneBands = (page: Page, name: string) =>
  page.getByRole('region', { name }).getByRole('list', { name: 'Temps de trajet' }).getByRole('listitem');

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
  expect(isochroneCalls).toEqual(ign('pedestrian', [5, 10, 15]));

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

test('changer la durée depuis la fiche recalcule la zone une fois le réglage choisi', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'ecole normale', /ECOLE NORMALE SUPERIEURE DE LYON/);
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);

  // Deux clics rapprochés : seul le réglage final est calculé (vélo, Geoapify)
  await clickSettings(page, ['30 minutes', 'Vélo']);

  await expect(zoneBands(page, 'En 30 min à vélo')).toHaveText(['≤ 10 min', '≤ 20 min', '≤ 30 min']);
  expect(isochroneCalls).toEqual([...ign('pedestrian', [5, 10, 15]), { profile: 'bicycle', minutes: [10, 20, 30] }]);

  // Retour à un réglage déjà vu : zone servie par le cache, sans requête
  await clickSettings(page, ['15 minutes', 'Marche']);
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);
  await page.waitForTimeout(600);
  expect(isochroneCalls).toHaveLength(4);
});

test('une zone déjà calculée revient sans requête, y compris pour un site au même endroit', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'rennes 2', /^UNIVERSITÉ RENNES 2/);
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);
  await page.keyboard.press('Escape');

  await searchAndPick(page, 'rennes 2', /^UNIVERSITÉ RENNES 2/);
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);
  await page.keyboard.press('Escape');

  // UFR sur le même site que l'université : même zone
  await searchAndPick(page, 'sciences humaines', /UFR SCIENCES HUMAINES/);
  await expect(page.getByRole('heading', { level: 2, name: /UFR SCIENCES HUMAINES/ })).toBeVisible();
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);
  expect(isochroneCalls).toHaveLength(3);
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
  await expect(page.getByRole('combobox', { name: /Search/ })).toHaveAttribute('placeholder', 'School, programme, city or address');
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

test('accueil centré sur la recherche : ni réglages de trajet ni calcul de toutes les zones', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./');
  await expect(legendCount(page, 'Université')).toContainText('4');

  await expect(page.getByRole('radio', { name: 'Marche' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Calculer/ })).toHaveCount(0);
  expect(isochroneCalls).toEqual([]);
});

test('transports en commun : zone Geoapify en « approximated_transit »', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'ecole normale', /ECOLE NORMALE SUPERIEURE DE LYON/);
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);
  await page.getByRole('radio', { name: 'Transports en commun' }).check({ force: true });
  await expect(page.getByText(/estimation à partir des lignes de bus, tram et métro/)).toBeVisible();

  await expect(zoneBands(page, 'En 15 min en transports en commun')).toHaveText(['≤ 5 min', '≤ 10 min', '≤ 15 min']);
  expect(isochroneCalls.at(-1)).toEqual({ profile: 'approximated_transit', minutes: [5, 10, 15] });
});

test('limite de débit de l’IGN (429) : la zone arrive après l’attente', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page, { ignRateLimited: 1 });
  await page.goto('./');

  await searchAndPick(page, 'ecole normale', /ECOLE NORMALE SUPERIEURE DE LYON/);
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveText(['≤ 5 min', '≤ 10 min', '≤ 15 min'], { timeout: 15_000 });
  // Bande de 5 min refusée puis redemandée
  expect(isochroneCalls).toEqual(ign('pedestrian', [5, 5, 10, 15]));
});

test('clé Geoapify refusée : le vélo l’annonce sans proposer de réessayer, la marche reste disponible', async ({ page }) => {
  await mockApis(page, { geoapifyStatus: 401 });
  await page.goto('./');

  await searchAndPick(page, 'ecole normale', /ECOLE NORMALE SUPERIEURE DE LYON/);
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);

  await page.getByRole('radio', { name: 'Vélo' }).check({ force: true });
  const zone = page.getByRole('region', { name: 'En 15 min à vélo' });
  await expect(zone).toContainText('La clé Geoapify a été refusée');
  await expect(zone.getByRole('button', { name: 'Réessayer' })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Marche' }).check({ force: true });
  await expect(zoneBands(page, 'En 15 min à pied')).toHaveCount(3);
});

test('calques CROUS et résidences CROUS dans la zone de l’établissement', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await page.getByRole('button', { name: 'Fond de carte et calques' }).click();
  await page.getByRole('checkbox', { name: 'Résidences CROUS' }).check();
  await page.keyboard.press('Escape');
  await searchAndPick(page, 'sciences appliquees', /INSTITUT NATIONAL DES SCIENCES APPLIQUEES/);

  await expect(page.getByRole('button', { name: 'Résidence CROUS : Résidence Jean Zay' })).toBeVisible();
  const crous = page.getByRole('region', { name: '1 résidence CROUS dans la zone' });
  await expect(crous).toContainText('Résidence Jean Zay');
  await expect(crous).toContainText('1 restaurant ou cafétéria CROUS dans la zone');
});

test('fond de carte Plan IGN par défaut, OpenStreetMap au choix', async ({ page }) => {
  await mockApis(page);
  const tiles: string[] = [];
  page.on('request', (r) => tiles.push(new URL(r.url()).hostname));
  await page.goto('./');
  await expect.poll(() => tiles.includes('data.geopf.fr')).toBe(true);

  await page.getByRole('button', { name: 'Fond de carte et calques' }).click();
  await page.getByRole('radio', { name: 'OpenStreetMap' }).check();
  await expect.poll(() => tiles.includes('tile.openstreetmap.org')).toBe(true);
});

test('Plan IGN en échec : repli sur OpenStreetMap signalé, sans changer le fond enregistré', async ({ page }) => {
  await mockApis(page, { ignTilesStatus: 404 });
  const tiles: string[] = [];
  page.on('request', (r) => tiles.push(new URL(r.url()).hostname));
  await page.goto('./');

  const notice = page.getByRole('status').filter({ hasText: 'Plan IGN indisponible ici : fond OpenStreetMap affiché' });
  await expect(notice).toBeVisible();
  await expect.poll(() => tiles.includes('tile.openstreetmap.org')).toBe(true);
  await page.getByRole('button', { name: 'Fond de carte et calques' }).click();
  await expect(page.getByRole('radio', { name: 'OpenStreetMap' })).toBeChecked();
  // Le Plan IGN reste le fond préféré : il reviendra à la prochaine visite
  expect(await page.evaluate(() => localStorage.getItem('baseLayer'))).not.toBe('osm');

  await page.keyboard.press('Escape');
  await notice.getByRole('button', { name: "Fermer l'avis" }).click();
  await expect(notice).toHaveCount(0);
});

test('filtre par formation depuis la recherche', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  await page.getByRole('combobox', { name: /Rechercher/ }).fill('informatique');
  const option = page.getByRole('listbox').getByRole('option', { name: /BUT - Informatique/ });
  await expect(option).toContainText('2 établissements');
  await option.click();

  await expect(page.getByRole('button', { name: 'Retirer le filtre par formation' })).toBeVisible();
  await expect(legendCount(page, 'Université')).toContainText('2');
  await expect(legendCount(page, 'École spécialisée')).toContainText('0');
  expect(new URL(page.url()).searchParams.get('formation')).toBe('BUT - Informatique');
});

test('un lien partagé rouvre la fiche avec son trajet', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./?etab=0694123A&mode=cycling&duree=30');

  await expect(page.getByRole('heading', { level: 2, name: 'ECOLE NORMALE SUPERIEURE DE LYON' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'En 30 min à vélo' })).toBeVisible();
  expect(isochroneCalls[0]).toEqual({ profile: 'bicycle', minutes: [10, 20, 30] });

  // L'URL suit la navigation
  await page.getByRole('radio', { name: '45 minutes' }).check({ force: true });
  await expect.poll(() => new URL(page.url()).searchParams.get('duree')).toBe('45');
  await page.keyboard.press('Escape');
  await expect.poll(() => new URL(page.url()).searchParams.get('etab')).toBeNull();
});

test('établissements accessibles depuis une adresse', async ({ page }) => {
  const { isochroneCalls } = await mockApis(page);
  await page.goto('./');

  await searchAndPick(page, 'albert einstein', /20 Avenue Albert Einstein/);
  const origin = page.getByRole('region', { name: /Depuis 20 Avenue Albert Einstein/ });
  // Réglages de trajet dans le panneau du point de départ
  await expect(origin.getByRole('radio', { name: 'Marche' })).toBeChecked();
  await origin.getByRole('button', { name: 'Voir les établissements accessibles en 15 min à pied' }).click();

  // Zone simulée de ±0,012° autour de l'adresse : l'INSA et l'IUT, pas l'ENS
  await expect(origin).toContainText('2 établissements accessibles en 15 min à pied');
  await expect(origin.getByRole('listitem')).toHaveCount(2);
  expect(isochroneCalls).toEqual(ign('pedestrian', [5, 10, 15]));
  await expect(legendCount(page, 'Université')).toContainText('1');
  expect(new URL(page.url()).searchParams.get('depuis')).toBe('45.7826,4.8737');

  await origin.getByRole('button', { name: /IUT LYON 1/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'IUT LYON 1' })).toBeVisible();
});

test('favoris et comparaison', async ({ page }) => {
  await mockApis(page);
  await page.goto('./');

  for (const [query, name] of [['sciences appliquees', /INSTITUT NATIONAL DES SCIENCES APPLIQUEES/], ['iut lyon', /IUT LYON 1/]] as const) {
    await searchAndPick(page, query, name);
    await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
    await expect(page.getByRole('button', { name: 'Retirer des favoris' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
  }

  const favorites = page.getByRole('region', { name: 'Mes favoris' });
  await expect(favorites.getByRole('listitem')).toHaveCount(2);
  await favorites.getByRole('button', { name: 'Comparer les 2 favoris' }).click();

  const compare = page.getByRole('article', { name: 'Comparaison des favoris' });
  await expect(compare.getByRole('listitem')).toHaveCount(2);
  await expect(compare.getByRole('listitem').first()).toContainText('Résidences CROUS1');
  await expect(compare.getByRole('listitem').nth(1)).toContainText('Formations Parcoursup2');
});
