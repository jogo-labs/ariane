import createPreset, { DEFAULT_COMMIT_TYPES } from 'conventional-changelog-conventionalcommits';

/**
 * Configuration de `npm run changelog` (conventional-changelog), utilisée à la release pour
 * générer la section de la version à publier depuis les Conventional Commits.
 *
 * Seuls les types qui changent le comportement ou l'API de `@ariane-ui/core` sont listés ;
 * docs, tests, style, build, ci et chore sont masqués. Les commits du site de documentation
 * (scope `docs`) sont écartés : ils n'intéressent pas un consommateur du package.
 */
const SECTIONS = {
    feat: 'Ajouté',
    fix: 'Corrigé',
    perf: 'Performance',
    refactor: 'Modifié',
    revert: 'Annulé',
};

export default createPreset({
    types: DEFAULT_COMMIT_TYPES.map((entry) => {
        const section = SECTIONS[entry.type];
        return section ? { ...entry, section, hidden: false } : { ...entry, hidden: true };
    }),
    ignoreCommits: /^\w+\(docs\)!?:/,
    formatNoteTitle: () => 'Changements incompatibles',
});
