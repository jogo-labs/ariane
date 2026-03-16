/** @type {import('@commitlint/types').UserConfig} */
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Types autorisés : feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'style',
                'refactor',
                'test',
                'chore',
                'build',
                'ci',
                'perf',
                'revert',
            ],
        ],
        // Scope optionnel mais doit être en minuscules si présent (ex: feat(button): ...)
        'scope-case': [2, 'always', 'lower-case'],
        // Autorise les majuscules dans le sujet (ex: CEM, API, MDX...)
        // Seul un sujet entièrement en majuscules est interdit.
        'subject-case': [2, 'never', 'upper-case'],
    },
};
