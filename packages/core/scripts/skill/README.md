# Skill `ariane` et `llms.txt`

Ce dossier produit la skill `ariane` (pour les consommateurs d'Ariane, pas pour contribuer au repo) et le repli `llms.txt` publiés dans `@ariane-ui/core` (#264). Ce README n'est pas publié.

## Deux zones, un auteur par fichier

| Zone    | Où                                                                  | Qui l'écrit                                              |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| Écrite  | `content/ariane/` (versionnée)                                      | une personne (ou Claude, sur demande) ; jamais un script |
| Générée | `skills/ariane/references/components/` et `llms/` (ignorés par git) | `build-skill.js` à chaque build                          |

Ne modifiez jamais `skills/` ni `llms/` : ils sont recréés à chaque build. Pour changer un fichier écrit, éditez `content/ariane/`. Aucun fichier ne mélange texte écrit et tableau généré.

## Mettre à jour la skill

1. Éditez le fichier concerné de `content/ariane/`.
2. `npm run build:manifest && npm run build:skill` (depuis `packages/core`).
3. `npm run check:skill` : échoue si un tag, un attribut ou un token cité n'existe plus, si un composant racine n'est pas dans `choosing-components.md`, ni cité dans les listes de composants de `README.md` et `packages/core/README.md`, si un lien relatif est cassé.

## Quand mettre à jour

Mettez à jour `content/ariane/` quand l'API publique (attribut, slot, événement, méthode, propriété CSS, part), un comportement ou une règle d'usage change, ou quand un composant est ajouté, renommé ou supprimé (le contrôle échoue tant que `choosing-components.md` et les listes de composants des deux README ne sont pas à jour). Le tableau d'API par composant, lui, suit seul le CEM et les MDX.

## Règles de rédaction (lecteur : un agent)

- Compresser, ne pas recopier la doc du site : tables, listes, exemples HTML copiables, règles « si X, utiliser Y », pièges énoncés directement.
- Concis ne veut pas dire lacunaire : noms d'attribut, valeurs par défaut et contraintes exacts et complets.
- Un fichier, une tâche ; `SKILL.md` route vers les références et ne détaille rien.
- Tout est tiré d'une source lue ; le jugement (arbre de décision, confusions) est assumé comme tel.
- Pas de lien vers le site de doc (pas de domaine public) ; citer les tags dans des tables ou du code inline pour que le contrôle s'applique.
- `theming.md` décrit la structure et le contrat, jamais les valeurs de la palette du thème par défaut.

## Limites du contrôle

Il vérifie les noms (tags, attributs, tokens, liens), pas la vérité d'une phrase de conseil ni les valeurs d'attribut. La relecture à la release complète (voir `ariane-create-release`).

Spec : `docs/superpowers/specs/2026-10-02-skill-llms-264-design.md`.
