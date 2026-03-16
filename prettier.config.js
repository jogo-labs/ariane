/** @type {import('prettier').Config} */
export default {
    singleQuote: true,
    semi: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,

    overrides: [
        {
            // YAML et JSON ont conventionnellement 2 espaces
            files: ['*.json', '*.yml', '*.yaml'],
            options: { tabWidth: 2 },
        },
    ],
};
