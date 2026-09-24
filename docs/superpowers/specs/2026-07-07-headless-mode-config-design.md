# Mode headless (#47) — structure de configuration et autoloader CDN — design

Date : 2026-07-07
Statut : validé

## Contexte

L'issue #47 vise à exporter les classes Lit des composants sans auto-enregistrement des tags
custom elements, pour permettre à un consommateur (npm ou CDN) de renommer les tags (ex.
`acme-alert` au lieu de `ar-alert`).

L'issue #80 (infrastructure i18n — `setLocale()` + labels traduisibles) est un chantier distinct
mais a été identifiée comme partageant potentiellement le même mécanisme de configuration
(`window.ARIANE_CONFIG`). Décision de scope (voir [[project_backlog]] et [[project_headless_mode]]) :
**ce chantier traite uniquement #47**. La structure de configuration est conçue pour ne pas
devoir changer de forme quand #80 sera implémenté, mais aucune logique i18n n'est construite ici.

Un spike de validation a été mené sur `ar-spinner` (2026-07-08, voir [[project_headless_mode]])
pour confirmer que le CEM analyzer résout toujours `tagName`/`customElement: true` quand le
`customElements.define()` est déplacé dans un fichier `index.ts` séparé — validé. Ce design
généralise ce pattern aux 19 composants et ajoute le mécanisme de préfixe CDN qui manquait au
spike initial.

## Deux contextes de consommation, deux mécanismes

Ariane est **CDN-first** (comme Web Awesome) : la majorité des consommateurs chargent la lib via
`<script>` tag sans écrire de JS custom. Le npm/headless est le chemin pour les consommateurs qui
« savent ce qu'ils font » et écrivent leur propre code d'enregistrement.

Ces deux contextes ont des besoins de personnalisation du tag radicalement différents, donc deux
mécanismes séparés plutôt qu'un seul unifié :

|                                       | CDN (`<script>`, autoloader)                                                 | npm (import direct)                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Qui appelle `customElements.define()` | L'autoloader, pour le consommateur                                           | Le consommateur lui-même                                                    |
| Personnalisation du tag               | Un seul préfixe global, via `window.ARIANE_CONFIG.prefix`                    | Libre, tag par tag, dans le code du consommateur — aucune config nécessaire |
| Pourquoi cette limite en CDN          | Pas de JS custom écrit par le consommateur → il faut un mécanisme déclaratif | Le JS du consommateur EST déjà le mécanisme de configuration                |

## Décisions

### 1. Contrat de configuration : `window.ARIANE_CONFIG`

```ts
interface ArianeConfig {
    /** Préfixe des tags custom elements générés par l'autoloader CDN. Défaut : 'ar'. */
    prefix?: string;
    /**
     * Réservé pour #80 (infrastructure i18n). Structure figée pour éviter un breaking
     * change de shape plus tard, mais non lu par le code tant que #80 n'est pas implémenté.
     * Forme : { <composant camelCase sans "ar">: { <clé de label>: <valeur traduite> } }
     * ex. { tableSort: { ascending: '...', descending: '...', none: '...' } }
     */
    i18n?: Record<string, Record<string, string>>;
}

declare global {
    interface Window {
        ARIANE_CONFIG?: ArianeConfig;
    }
}
```

Déclaré dans un nouveau fichier ambient `packages/core/src/types/ariane-config.d.ts` (déclaration
de type uniquement, aucun runtime).

`i18n` est typé dès maintenant pour verrouiller la forme externe (éviter qu'un consommateur CDN
early-adopter écrive une config `i18n` qui devienne incompatible plus tard), mais **aucun code ne
le lit** dans ce chantier — c'est un contrat, pas une fonctionnalité.

Ordre de chargement : le consommateur CDN est responsable de définir `window.ARIANE_CONFIG` (script
inline ou fichier externe versionné, importé dans le layout de chaque page) **avant** le script
Ariane. Ariane ne fetch rien de façon asynchrone pour lire cette config — lecture synchrone au
chargement du module autoloader. Point à documenter dans la doc CDN.

### 2. `packages/core/src/autoloader.ts` — préfixe dynamique

Remplace la table actuelle `tag → loader` par une table `nom de composant → loader de classe pure` :

```ts
const COMPONENT_DEFS: Record<string, () => Promise<Record<string, CustomElementConstructor>>> = {
    alert: () => import('./components/alert/alert.js'),
    spinner: () => import('./components/spinner/spinner.js'),
    // ...
};

const prefix = window.ARIANE_CONFIG?.prefix ?? 'ar';
```

L'autoloader résout le nom de composant à partir du tag observé dans le DOM (`tagName` moins le
préfixe), importe la classe pure correspondante, et appelle lui-même
`customElements.define(tagName, ExportedClass)` s'il n'est pas déjà défini. Les composants
individuels (`[name].ts`) n'ont plus de décorateur `@customElement` et n'enregistrent rien.

Ce point diverge du mapping produit par le spike spinner (`'ar-spinner': () =>
import('./components/spinner/index.js')`, qui réutilise le fichier `index.ts` auto-enregistrant en
dur `ar-spinner`) : ce mapping doit repointer vers `spinner.js` (classe pure), l'enregistrement
étant désormais fait par l'autoloader avec le tag préfixé dynamiquement.

Le défaut `'ar'` reste un littéral simple dans `autoloader.ts`, indépendant de la clé
`config.componentPrefix` de `packages/core/package.json` (voir section suivante) — coupler les deux
donnerait une fausse impression de source de vérité unique sans bénéfice réel, puisque les tags des
19 composants existants sont de toute façon gravés en dur dans leurs `index.ts` respectifs au
moment du scaffold, pas relus dynamiquement depuis `package.json`.

### 3. `src/index.ts` (bundle npm standard) — inchangé dans son principe

Continue d'importer `components/x/index.js` pour l'effet de bord d'enregistrement (`ar-x` en dur),
comme déjà fait pour `ar-spinner` par le spike. Le préfixe n'existe pas dans ce contexte.

### 4. `src/headless.ts` (nouveau) — barrel classes pures

Nouveau point d'entrée exportant uniquement les classes Lit pures (`ArAlert`, `ArSpinner`, ...),
sans aucun effet de bord d'enregistrement. Exposé via `package.json` `exports: { "./headless": ... }`.

### 5. Généralisation aux 18 composants restants

Pattern validé par le spike `ar-spinner`, à répliquer pour chaque composant :

1. Retirer `import { customElement }` et le décorateur `@customElement('ar-x')` de `[name].ts`.
2. Déplacer `declare global { interface HTMLElementTagNameMap {...} }` de `[name].ts` vers le
   nouveau `index.ts`.
3. Créer `[name]/index.ts` : importe la classe, `customElements.define('ar-x', ArX)`, déclare
   `HTMLElementTagNameMap`, ré-exporte la classe.
4. `src/index.ts` : ajouter `import './components/[name]/index.js';` (effet de bord) en plus de
   l'export de classe existant.
5. `src/headless.ts` : ajouter l'export de la classe pure.
6. `autoloader.ts` (`COMPONENT_DEFS`) : entrée `nom → import('./components/[name]/[name].js')`.
7. Fichiers de test import `./[name].js` pour l'effet de bord d'enregistrement → `./index.js`.
8. Pas de JSDoc `@customElement` requis (confirmé par le spike, le CEM résout via `index.ts`).

### 6. `scripts/create-component.js` — scaffold mis à jour

Génère directement le nouveau pattern (classe pure + `index.ts`) pour tout nouveau composant.
`config.componentPrefix` dans `package.json` reste utilisé **uniquement** ici (valeur gravée en dur
dans le `index.ts` généré au moment du scaffold) — usage inchangé, hors scope de ce chantier au-delà
de l'adaptation au nouveau pattern de fichiers.

### 7. Documenté, non implémenté dans ce chantier

- **Niveau 2 autoloader** (`createAutoloader` factory, mapping tag→loader libre fourni par le
  consommateur, pour renommer chaque composant individuellement plutôt qu'un seul préfixe global).
  Écarté par YAGNI — à construire si un besoin concret émerge.
- **Implémentation i18n (#80)** : lecture de `window.ARIANE_CONFIG.i18n`, précédence
  global > défaut (les attributs de label par instance existants, ex. `today-label` sur
  `ar-datepicker`, seront retirés au profit du seul dictionnaire global — décision actée pour
  éviter une transition douloureuse post-alpha, mais le retrait effectif des attributs est hors
  scope de ce chantier).
- **Bundles de locale prêts à l'emploi** (`en`, etc., chargement dynamique en CDN / statique en
  npm) — hors scope, dépend de #80.

## Fichiers impactés

- Nouveau : `packages/core/src/types/ariane-config.d.ts`, `packages/core/src/headless.ts`,
  18× `[name]/index.ts`
- Modifiés : `packages/core/src/autoloader.ts` (refonte du mapping + lecture prefix),
  `packages/core/src/index.ts` (imports side-effect), 18× `[name].ts` (retrait décorateur),
  fichiers de test important `./[name].js`, `packages/core/scripts/create-component.js`
  (scaffold), `packages/core/package.json` (`exports: "./headless"`)
- À vérifier : `cem.config.js` (déjà validé compatible par le spike)

## Hors scope (rappel)

Ce design ne couvre pas l'implémentation de #80 (i18n), ni le Niveau 2 de l'autoloader
(`createAutoloader`). Ces deux points sont documentés ci-dessus pour ne pas être perdus, mais ne
font pas partie du plan d'implémentation qui suivra ce design.
