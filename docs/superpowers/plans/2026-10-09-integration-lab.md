# Laboratoire d'intégration framework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire 4 rapports d'intégration (Angular, React, Vue, Next.js) triés par gravité, puis une synthèse dédoublonnée, avant le lancement de la beta d'Ariane.

**Architecture:** Un laboratoire hors dépôt (`~/Code/Active_projects/ariane-integration-lab/`) contient 4 apps générées par les scaffolders officiels et reliées au tarball `npm pack` de `packages/core`. Le scaffolding est scripté (aucun agent). Ensuite 4 agents Opus travaillent en parallèle, un par framework, avec la même grille (`SCENARIOS.md`) et le même format de rapport. Les agents ne modifient ni le dépôt Ariane ni GitHub.

**Tech Stack:** Node 24 (`.nvmrc` du dépôt), npm, Angular CLI, create-vite (React/Vue), create-next-app, Playwright (Chromium seul).

**Spec:** `docs/superpowers/specs/2026-10-09-integration-lab-design.md`

## Global Constraints

- Livrable des agents : rapport seul. Aucun correctif, aucune issue, aucun commit ni push.
- Un agent Opus par framework, en parallèle, même grille, même format.
- Smoke sur tous les composants (19 tags `ar-*` : alert, breadcrumb, breadcrumb-item, charcounter, collapse, datepicker, dialog, dropdown, dropdown-item, pagination, progressbar, spinner, stepper, stepper-item, tab, tab-group, tab-panel, table-sort, tooltip), puis scénarios approfondis sur 9 composants : `ar-pagination`, `ar-stepper`, `ar-table-sort`, `ar-datepicker`, `ar-dialog`, `ar-dropdown`, `ar-tab-group`, `ar-collapse`, `ar-alert`.
- Source du paquet : tarball local `npm pack` de `packages/core` depuis `dev` (`@ariane-ui/core@0.1.0-alpha.14`).
- Emplacement : `~/Code/Active_projects/ariane-integration-lab/`, `git init` local sans remote.
- Frameworks en dernière version stable, docs vérifiées via Context7.
- Aucun commit sur le dépôt Ariane (le spec et ce plan restent non suivis tant que le mainteneur n'a pas demandé le contraire). Seuls les commits locaux du laboratoire sont autorisés.
- Navigateur de test : Chromium seul (Firefox/Playwright ne démarre pas sur macOS 27, bug amont).
- Ports réservés : Angular 5100, React 5101, Vue 5102, Next 5103.
- Grille de gravité : 1 Bloquant, 2 Correctif avant beta (toute correction qui changerait l'API publique : attribut, événement, slot, part, token), 3 Après beta, 4 Doc / guide d'intégration.

## Review Focus

- Un agent écrit hors de son dossier (autre app, dépôt Ariane) : attendu, rien en dehors de `<framework>/` et de `reports/<framework>.md`. Test : `git status` du dépôt Ariane et du laboratoire après exécution (Task 4).
- Le build du tarball modifie des fichiers suivis du dépôt (`skills/`, `llms/`, manifest) : attendu, dépôt propre. Test : `git status --porcelain` après le build (Task 1).
- Un port est déjà occupé : attendu, échec explicite plutôt qu'une app qui sert un autre projet. Test : vérification des ports avant démarrage et `--strictPort` (Task 2).
- Deux rapports décrivent le même constat avec des gravités différentes : attendu, la synthèse l'indique au lieu de choisir en silence. Test : colonne « divergence » de la matrice (Task 5).
- Un constat non reproductible : attendu, rejeté de la synthèse. Test : rejouer au moins la reproduction de chaque constat de gravité 1 ou 2 (Task 5).

---

### Task 1: Tarball et squelette du laboratoire

**Files:**

- Create: `~/Code/Active_projects/ariane-integration-lab/` (dossier, `package.json`, `.gitignore`)
- Create: `~/Code/Active_projects/ariane-integration-lab/tarball/ariane-ui-core-0.1.0-alpha.14.tgz`
- Create: `~/Code/Active_projects/ariane-integration-lab/reports/.gitkeep`

**Interfaces:**

- Produces: variable de chemin `LAB=~/Code/Active_projects/ariane-integration-lab`, tarball à `$LAB/tarball/ariane-ui-core-0.1.0-alpha.14.tgz`, Playwright + Chromium installés à la racine du laboratoire.

- [ ] **Step 1: Vérifier l'état de départ**

```bash
cd /Users/jon/Code/Active_projects/ariane && git branch --show-current && git status --porcelain && cat .nvmrc && node --version
```

Expected: branche `dev`; seuls le spec et le plan non suivis (`docs/superpowers/...`) apparaissent; Node majeur 24. Si Node n'est pas en 24, lancer `nvm use` dans le dépôt avant de continuer.

- [ ] **Step 2: Construire le paquet core**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build
```

Expected: sortie sans erreur (inclut `check:cdn` et `check:skill`).

- [ ] **Step 3: Vérifier que le build n'a modifié aucun fichier suivi**

```bash
cd /Users/jon/Code/Active_projects/ariane && git status --porcelain
```

Expected: seuls le spec et le plan non suivis. S'il y a d'autres lignes : s'arrêter, les signaler à Jon, ne rien committer.

- [ ] **Step 4: Créer le laboratoire et le tarball**

```bash
LAB=~/Code/Active_projects/ariane-integration-lab
[ -e "$LAB" ] && echo "EXISTE DEJA" && exit 1
mkdir -p "$LAB/tarball" "$LAB/reports" && touch "$LAB/reports/.gitkeep"
cd /Users/jon/Code/Active_projects/ariane/packages/core && npm pack --pack-destination "$LAB/tarball"
ls -la "$LAB/tarball"
```

Expected: `ariane-ui-core-0.1.0-alpha.14.tgz` présent. Si le dossier existe déjà, s'arrêter et demander à Jon.

- [ ] **Step 5: Contrôler le contenu du tarball**

```bash
cd ~/Code/Active_projects/ariane-integration-lab && tar -tzf tarball/ariane-ui-core-0.1.0-alpha.14.tgz | grep -E "package/(dist/index.js|dist/custom-elements.json|cdn/autoloader.js|dist/styles/themes/ariane.css|package.json)$"
```

Expected: les 5 chemins listés.

- [ ] **Step 6: Initialiser le laboratoire (git, Playwright)**

```bash
cd ~/Code/Active_projects/ariane-integration-lab
git init
printf 'node_modules\n*/node_modules\n*/dist\n*/.next\n*/.angular\ntest-results\n' > .gitignore
npm init -y >/dev/null
npm install -D @playwright/test
npx playwright install chromium
git add -A && git commit -m "chore: laboratoire d'intégration, tarball alpha.14"
```

Expected: commit créé dans le laboratoire. Aucun remote configuré (`git remote -v` vide).

---

### Task 2: Scaffolder et vérifier les 4 apps

**Files:**

- Create: `$LAB/angular/`, `$LAB/react/`, `$LAB/vue/`, `$LAB/next/`

**Interfaces:**

- Consumes: tarball de la Task 1.
- Produces: 4 apps vierges (sans aucune configuration propre à Ariane), `@ariane-ui/core` installé depuis le tarball, serveur de dev démarrable sur le port réservé, build de production réussi. Le champ de dépendance dans chaque `package.json` pointe vers `file:../tarball/ariane-ui-core-0.1.0-alpha.14.tgz`.

Cette tâche s'arrête volontairement avant toute configuration Ariane (`CUSTOM_ELEMENTS_SCHEMA`, `isCustomElement`, imports, types JSX) : la découverte de cette configuration fait partie de ce que les agents testent.

- [ ] **Step 1: Vérifier que les ports sont libres**

```bash
for p in 5100 5101 5102 5103; do lsof -nP -iTCP:$p -sTCP:LISTEN && echo "PORT $p OCCUPE"; done; echo fin
```

Expected: seule la ligne `fin`. Sinon libérer le port ou demander à Jon.

- [ ] **Step 2: Vérifier les options des scaffolders (elles évoluent)**

```bash
cd /tmp 2>/dev/null; cd ~/Code/Active_projects/ariane-integration-lab
npx --yes @angular/cli@latest new --help 2>&1 | grep -E "skip-git|skip-install|defaults|style|ssr|routing|package-manager"
npm create vite@latest -- --help 2>&1 | head -30
npx --yes create-next-app@latest --help 2>&1 | grep -E "ts|app|tailwind|linter|use-npm|disable-git|yes"
```

Expected: les options utilisées ci-dessous existent. Si l'une a changé, adapter la commande correspondante et noter l'écart dans `reports/SCAFFOLD-NOTES.md`.

- [ ] **Step 3: Générer les 4 apps**

```bash
cd ~/Code/Active_projects/ariane-integration-lab
npx --yes @angular/cli@latest new angular --defaults --skip-git --style=css --ssr=false --routing=false --package-manager=npm
npm create vite@latest react -- --template react-ts
npm create vite@latest vue -- --template vue-ts
npx --yes create-next-app@latest next --ts --app --no-tailwind --no-linter --use-npm --disable-git --yes
ls
```

Expected: les 4 dossiers existent. Si create-vite pose des questions (installer, lancer le serveur), relancer avec `--no-interactive` si l'option est listée par l'aide, sinon répondre « non » à l'installation et au lancement.

- [ ] **Step 4: Installer les dépendances et le tarball dans chaque app**

```bash
cd ~/Code/Active_projects/ariane-integration-lab
for app in angular react vue next; do
  (cd $app && npm install && npm install ../tarball/ariane-ui-core-0.1.0-alpha.14.tgz) || echo "ECHEC $app"
done
grep -H '"@ariane-ui/core"' angular/package.json react/package.json vue/package.json next/package.json
```

Expected: aucune ligne `ECHEC`; 4 lignes de dépendance référant le tarball.

- [ ] **Step 5: Vérifier le build de production de chaque app**

```bash
cd ~/Code/Active_projects/ariane-integration-lab
(cd angular && npx ng build) && (cd react && npm run build) && (cd vue && npm run build) && (cd next && npm run build) && echo BUILDS-OK
```

Expected: `BUILDS-OK`. Une erreur à ce stade (avant toute config Ariane) est un problème de scaffolding à corriger ici, pas un constat.

- [ ] **Step 6: Vérifier que chaque serveur de dev démarre sur son port**

```bash
cd ~/Code/Active_projects/ariane-integration-lab
(cd angular && npx ng serve --port 5100 >/tmp/lab-angular.log 2>&1 &)
(cd react && npm run dev -- --port 5101 --strictPort >/tmp/lab-react.log 2>&1 &)
(cd vue && npm run dev -- --port 5102 --strictPort >/tmp/lab-vue.log 2>&1 &)
(cd next && npm run dev -- -p 5103 >/tmp/lab-next.log 2>&1 &)
sleep 25
for p in 5100 5101 5102 5103; do echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/)"; done
```

Expected: quatre `200`. Sinon lire le log correspondant dans `/tmp/lab-<app>.log`.

- [ ] **Step 7: Arrêter les serveurs et figer l'état**

```bash
for p in 5100 5101 5102 5103; do lsof -tiTCP:$p -sTCP:LISTEN | xargs -r kill; done
sleep 2; for p in 5100 5101 5102 5103; do lsof -nP -iTCP:$p -sTCP:LISTEN && echo "PORT $p ENCORE OCCUPE"; done; echo fin
cd ~/Code/Active_projects/ariane-integration-lab && git add -A && git commit -m "chore: scaffolding des 4 apps, tarball installé"
```

Expected: ports libérés, commit créé dans le laboratoire.

---

### Task 3: Écrire la grille, le brief et le gabarit de rapport

**Files:**

- Create: `$LAB/SCENARIOS.md`
- Create: `$LAB/BRIEF.md`
- Create: `$LAB/reports/TEMPLATE.md`

**Interfaces:**

- Produces: `SCENARIOS.md` (identifiants `S-SMOKE`, `S-SERVER-*`, `S-FORM-*`, `S-EVENT`, `S-TYPES`, `S-SSR`, `S-THEME`, `S-I18N`, `S-PREFIX`), `BRIEF.md` (contrat d'agent, paramétré par `<framework>`), `reports/TEMPLATE.md` (format d'un constat). Les agents de la Task 4 ne lisent que ces trois fichiers et le dossier de leur app.

- [ ] **Step 1: Écrire `SCENARIOS.md`**

```markdown
# Grille de scénarios (commune aux 4 frameworks)

Chaque scénario est joué dans un vrai navigateur (Playwright, Chromium). Pour chaque écart, produire un constat au format de `reports/TEMPLATE.md`.

Sources de vérité sur le paquet : `node_modules/@ariane-ui/core/dist/custom-elements.json` (API générée), `node_modules/@ariane-ui/core/skills/` et `llms/` (guides destinés aux consommateurs). Lire d'abord ces fichiers, comme le ferait un utilisateur.

## S-SMOKE — les 19 composants montent

Monter chaque tag une fois dans une page de l'app : `ar-alert`, `ar-breadcrumb`, `ar-breadcrumb-item`, `ar-charcounter`, `ar-collapse`, `ar-datepicker`, `ar-dialog`, `ar-dropdown`, `ar-dropdown-item`, `ar-pagination`, `ar-progressbar`, `ar-spinner`, `ar-stepper`, `ar-stepper-item`, `ar-tab`, `ar-tab-group`, `ar-tab-panel`, `ar-table-sort`, `ar-tooltip`. Vérifier : l'élément est défini (`customElements.get`), son shadow DOM se rend, aucune erreur ni avertissement console, aucune erreur de compilation/typage du framework. Noter précisément la configuration que le framework a exigée (schéma, option de compilateur, import) et si elle est documentée dans les guides du paquet.

## S-SERVER — composants dont l'état dépend d'une réponse serveur

Simuler un serveur avec une fonction asynchrone à délai et échec configurables (par exemple 300 ms, 2 s, rejet). Pour chaque scénario, l'état de l'application (store/signal/state du framework) est la source de vérité. Critères : le consommateur peut refuser ou différer la transition ; l'affichage ne diverge pas de la vérité serveur ; l'état d'attente est exprimable ; aucun état incohérent après une réponse tardive, en erreur ou hors ordre. Un composant qui ne permet pas de satisfaire un critère est un constat « Correctif avant beta » (la correction changerait l'API).

- **S-SERVER-PAGINATION** : `ar-pagination` avec `current` et `total` pilotés par l'état. Annuler `ar-pagination-page-change` (cancelable) pendant la requête, appliquer la page à `ar-pagination-page-changed` seulement après succès. Cliquer rapidement sur 3 pages différentes : la dernière réponse reçue ne doit pas gagner si elle est périmée. Échec serveur : la page affichée reste l'ancienne.
- **S-SERVER-STEPPER** : `ar-stepper` avec `current-path` piloté par l'état. `ar-stepper-step-change` annulable : l'étape n'avance qu'après validation serveur ; refus serveur : le stepper reste sur l'étape. Mode mobile et desktop (`desktop-from`).
- **S-SERVER-TABLESORT** : `ar-table-sort` avec tri côté serveur. Utiliser `pending` pendant la requête, appliquer `order` après réponse, vérifier `aria-sort` et l'événement `ar-table-sort-change`. Échec serveur : l'ordre précédent est conservé.
- **S-SERVER-DATEPICKER** : `ar-datepicker` avec dates indisponibles chargées de façon asynchrone après ouverture ; changement de mois pendant le chargement.
- **S-SERVER-DIALOG** : `ar-dialog` : fermeture seulement après réponse (annulation de `ar-dialog-hide`/`dismissed`/`accepted` selon l'API), refus de fermer sur erreur, réouverture immédiate.

## S-FORM — formulaires

- **S-FORM-DATEPICKER** : `ar-datepicker` dans un formulaire géré par le framework (v-model, ngModel ou formControl, état contrôlé React, Server Action ou formulaire contrôlé sous Next). Valeur initiale, mise à jour dans les deux sens, réinitialisation, validation, soumission.
- **S-FORM-CHARCOUNTER** : `ar-charcounter` lié à un champ géré par le framework.

## S-EVENT — événements

Pour `ar-pagination`, `ar-stepper`, `ar-table-sort`, `ar-datepicker`, `ar-dialog`, `ar-dropdown`, `ar-collapse`, `ar-tab-group` : écouter les événements avec la syntaxe native du framework, lire `detail` (dont `detail.id`), vérifier la typographie des noms (kebab-case), la propagation (`bubbles`, `composed`) et le typage du `detail` côté TypeScript.

## S-TYPES — typage et configuration

Obtenir un projet sans erreur de typage avec les 19 tags : JSX/TSX (React, Next), schéma d'éléments personnalisés (Angular), `isCustomElement` (Vue). Les attributs booléens, les propriétés objets et les événements typés sont-ils acceptés ? Relever tout `any`, tout `ts-ignore` ou toute configuration manuelle nécessaire.

## S-SSR — rendu serveur (Next uniquement, Angular SSR en bonus si simple)

Rendu côté serveur de `ar-pagination`, `ar-tab-group`, `ar-alert`, `ar-collapse` : erreurs d'hydratation, `'use client'` obligatoire ou non, enregistrement des éléments côté client, flash de contenu non stylé, avertissements console.

## S-THEME — thème

Appliquer le thème fourni (`@ariane-ui/core/themes/ariane.css`, `arianeTheme` de `themes/ariane.js` pour un shadow DOM applicatif) et le thème du starter-kit (`~/Code/Active_projects/ariane-starter-kit/ariane-starter.css`, lecture seule). Vérifier : le CSS s'importe via le bundler du framework, les tokens et `::part()` s'appliquent, mode sombre, absence de fuite de styles du framework.

## S-I18N — traductions

`registerTranslation` (`@ariane-ui/core/utils`) : enregistrer une langue, changer `lang` du document à chaud, vérifier les libellés de `ar-pagination`, `ar-datepicker`, `ar-alert`, `ar-dialog`.

## S-PREFIX — préfixe personnalisé

Utiliser le préfixe configurable (`window.ARIANE_CONFIG.prefix` pour l'autoloader, `@ariane-ui/core/headless` pour l'enregistrement manuel) : les tags avec un préfixe différent fonctionnent, les types et schémas du framework suivent.
```

- [ ] **Step 2: Écrire `reports/TEMPLATE.md`**

```markdown
# Rapport d'intégration — <framework> <version>

## Environnement

Versions (framework, Node, navigateur), tarball utilisé, ports.

## Configuration exigée par le framework

Ce qu'il a fallu écrire pour que les composants fonctionnent, et où c'est (ou non) documenté dans les guides du paquet.

## Résumé

Tableau : scénario → résultat (OK / constats) ; nombre de constats par gravité.

## Constats

### C-<framework>-001 — <titre court>

- **Scénario** : `S-...`
- **Composant(s)** : `ar-...`
- **Gravité** : 1 Bloquant | 2 Correctif avant beta | 3 Après beta | 4 Doc
- **Origine** : composant | spécifique au framework | doc
- **Changement d'API si corrigé ?** oui/non (attribut, événement, slot, part ou token concerné)
- **Reproduction minimale** : fichiers et étapes exactes, commande pour la rejouer (chemin du test Playwright ou de la page).
- **Observé** :
- **Attendu** :
- **Piste de correctif (non implémentée)** :
```

- [ ] **Step 3: Écrire `BRIEF.md`**

```markdown
# Brief d'agent — analyse d'intégration pour <framework>

Tu analyses l'usage d'Ariane (`@ariane-ui/core`, web components Lit) dans <framework>, en conditions de projet réel, avant le lancement de la beta. L'objectif est de trouver les problèmes qui obligeraient à changer l'API publique après la beta.

## Périmètre et interdits

- Ton app : `~/Code/Active_projects/ariane-integration-lab/<framework>/` (déjà générée, avec le tarball installé, sans aucune configuration Ariane). Port réservé : <port>.
- Tu peux écrire uniquement dans ce dossier et dans `reports/<framework>.md`. Les autres apps et la racine du laboratoire sont en lecture seule, sauf Playwright installé à la racine (à utiliser tel quel).
- Interdit : modifier le dépôt `~/Code/Active_projects/ariane` (lecture seule, utile pour lire le code source des composants), créer des issues GitHub, committer, pousser, publier.
- Pour la syntaxe et les bonnes pratiques de <framework>, vérifie dans la documentation à jour via Context7 plutôt que de te fier à tes connaissances.
- Navigateur : Chromium via Playwright uniquement.

## Travail

1. Lire `SCENARIOS.md` en entier.
2. Configurer l'app comme le ferait un utilisateur qui découvre Ariane, à partir de `node_modules/@ariane-ui/core/skills/` et `llms/`. Noter chaque obstacle, chaque lacune de ces guides.
3. Jouer `S-SMOKE`, puis tous les autres scénarios applicables à <framework>.
4. Pour chaque écart, créer un constat au format de `reports/TEMPLATE.md`, avec une reproduction rejouable (test Playwright ou page précise). N'invente rien : un constat sans reproduction est écarté.
5. Écrire `reports/<framework>.md` à partir du gabarit. Ne propose des pistes de correctif que sous forme de texte.
6. Terminer par un message court : chemin du rapport et nombre de constats par gravité.

## Règle de gravité

1 Bloquant (inutilisable) ; 2 Correctif avant beta (toute correction changerait l'API publique : attribut, événement, slot, part, token) ; 3 Après beta (corrigeable sans changer l'API) ; 4 Doc / guide d'intégration. En cas de doute entre 2 et 3, choisis 2 et explique.
```

- [ ] **Step 4: Vérifier qu'aucun marqueur de gabarit ne traîne dans la grille**

```bash
cd ~/Code/Active_projects/ariane-integration-lab && grep -nE "TBD|TODO|XXX" SCENARIOS.md BRIEF.md reports/TEMPLATE.md; echo "fin"
```

Expected: seule la ligne `fin`. (Les `<framework>` et `<port>` de `BRIEF.md` sont substitués à la Task 4, pas ici.)

- [ ] **Step 5: Committer dans le laboratoire**

```bash
cd ~/Code/Active_projects/ariane-integration-lab && git add -A && git commit -m "docs: grille de scénarios, brief et gabarit de rapport"
```

Expected: commit créé dans le laboratoire.

---

### Task 4: Lancer les 4 agents Opus en parallèle

**Files:**

- Create: `$LAB/reports/angular.md`, `react.md`, `vue.md`, `next.md` (écrits par les agents)

**Interfaces:**

- Consumes: `BRIEF.md`, `SCENARIOS.md`, `reports/TEMPLATE.md`, apps de la Task 2.
- Produces: 4 rapports au format du gabarit, identifiants `C-<framework>-NNN`.

**Prérequis :** Jon a confirmé le lancement (feu vert explicite pour cette tâche, séparé de l'approbation du plan).

- [ ] **Step 1: Capturer l'état de référence des deux dépôts**

```bash
cd /Users/jon/Code/Active_projects/ariane && git status --porcelain > /tmp/lab-ariane-before.txt && git rev-parse HEAD >> /tmp/lab-ariane-before.txt
cd ~/Code/Active_projects/ariane-integration-lab && git status --porcelain && git rev-parse HEAD
```

Expected: le laboratoire est propre; l'état d'Ariane est enregistré.

- [ ] **Step 2: Lancer les 4 agents dans un seul message (appels `Agent` parallèles, `model: "opus"`)**

Pour chaque ligne ci-dessous, un appel `Agent` avec `subagent_type: "general-purpose"`, `model: "opus"`, et ce prompt (remplacer `<framework>`, `<port>`) :

| framework | port |
| --------- | ---- |
| angular   | 5100 |
| react     | 5101 |
| vue       | 5102 |
| next      | 5103 |

```
Lis ~/Code/Active_projects/ariane-integration-lab/BRIEF.md et suis-le à la lettre en remplaçant <framework> par "<framework>" et <port> par "<port>". Lis ensuite SCENARIOS.md et reports/TEMPLATE.md dans le même dossier. Livrable : reports/<framework>.md. Respecte strictement les interdits du brief (aucune modification du dépôt Ariane, aucune issue, aucun commit).
```

Expected: 4 agents lancés en arrière-plan; attendre leurs notifications de fin (ne pas sonder).

- [ ] **Step 3: Vérifier l'absence d'effets de bord**

```bash
cd /Users/jon/Code/Active_projects/ariane && git status --porcelain > /tmp/lab-ariane-after.txt && git rev-parse HEAD >> /tmp/lab-ariane-after.txt && diff /tmp/lab-ariane-before.txt /tmp/lab-ariane-after.txt && echo ARIANE-INCHANGE
for p in 5100 5101 5102 5103; do lsof -nP -iTCP:$p -sTCP:LISTEN; done; echo ports-verifies
cd ~/Code/Active_projects/ariane-integration-lab && git status --short | head -40 && ls reports
```

Expected: `ARIANE-INCHANGE`; aucun serveur resté ouvert (sinon les arrêter); quatre rapports présents; les modifications du laboratoire se limitent aux dossiers d'app et à `reports/`.

- [ ] **Step 4: Contrôler la forme des rapports**

```bash
cd ~/Code/Active_projects/ariane-integration-lab/reports
for f in angular react vue next; do echo "$f: $(grep -c '^### C-' $f.md) constats, sans reproduction: $(grep -c 'Reproduction minimale' $f.md)"; done
```

Expected: le nombre de lignes « Reproduction minimale » est égal au nombre de constats pour chaque rapport. Si un rapport manque ou diverge, renvoyer un message à l'agent concerné (SendMessage) plutôt que de corriger à sa place.

- [ ] **Step 5: Committer les rapports dans le laboratoire**

```bash
cd ~/Code/Active_projects/ariane-integration-lab && git add -A && git commit -m "docs: rapports d'intégration des 4 frameworks"
```

Expected: commit créé dans le laboratoire.

---

### Task 5: Synthèse, vérification des constats critiques et tri avec Jon

**Files:**

- Create: `$LAB/reports/SYNTHESIS.md`

**Interfaces:**

- Consumes: les 4 rapports de la Task 4.
- Produces: `SYNTHESIS.md` avec une matrice composant × framework, une liste dédoublonnée de constats (`S-001`…) avec les identifiants sources, la gravité retenue et une colonne « divergence » quand les rapports ne s'accordent pas.

- [ ] **Step 1: Lire les 4 rapports en entier**

Lire `angular.md`, `react.md`, `vue.md`, `next.md`. Ne pas résumer à partir des en-têtes seuls.

- [ ] **Step 2: Rejouer les reproductions des constats de gravité 1 et 2**

Pour chaque constat de gravité 1 ou 2, exécuter la reproduction indiquée (test Playwright ou page) et noter « confirmé » ou « non reproduit ». Démarrer les serveurs sur les ports réservés si besoin et les arrêter ensuite. Un constat non reproduit est signalé comme tel dans la synthèse, pas supprimé.

- [ ] **Step 3: Écrire `SYNTHESIS.md`**

Structure :

1. Résumé : nombre de constats par gravité et par origine.
2. Matrice composant × framework (OK / constat).
3. Constats dédoublonnés (`S-NNN`) : titre, composants, frameworks concernés, identifiants sources, gravité retenue, divergence éventuelle, changement d'API (oui/non), statut de reproduction, piste de correctif.
4. Constats présents dans plusieurs frameworks (probablement des défauts du composant) séparés de ceux présents dans un seul (probablement l'intégration).
5. Lacunes de documentation et de guides (gravité 4) regroupées.

- [ ] **Step 4: Vérifier la cohérence**

```bash
cd ~/Code/Active_projects/ariane-integration-lab/reports
grep -oE "C-(angular|react|vue|next)-[0-9]+" angular.md react.md vue.md next.md | cut -d: -f2 | sort -u > /tmp/lab-ids-src.txt
grep -oE "C-(angular|react|vue|next)-[0-9]+" SYNTHESIS.md | sort -u > /tmp/lab-ids-syn.txt
comm -23 /tmp/lab-ids-src.txt /tmp/lab-ids-syn.txt
```

Expected: sortie vide (tout constat source apparaît dans la synthèse).

- [ ] **Step 5: Présenter à Jon pour tri commun**

Résumer en une page : constats bloquants et « avant beta » d'abord, puis le reste, puis les lacunes de doc. Demander le tri constat par constat. Ne créer aucune issue avant l'accord de Jon.

- [ ] **Step 6: Committer dans le laboratoire**

```bash
cd ~/Code/Active_projects/ariane-integration-lab && git add -A && git commit -m "docs: synthèse des rapports d'intégration"
```

Expected: commit créé dans le laboratoire.

---

### Task 6: Suite (hors exécution de ce plan)

Après le tri avec Jon :

- Ouvrir les issues décidées (`avant-beta` / `après-beta`), via `gh`, avec accord explicite.
- Rouvrir à part la question des apps de test permanentes (dépôt frère ou `examples/`).
- Écrire l'issue de préparation du passage en beta (bandeau alpha→beta, badges des pages composant, mentions « alpha », dist-tag npm, avertissements de dépréciation, README/package.json du starter-kit), en tenant compte des constats.
- Mettre à jour la note mémoire `project_beta_prep.md`.
