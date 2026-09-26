import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { deriveNeutralButtonsPreset } from './derive-neutral-buttons-preset.js';

/**
 * Copie les presets CSS (boutons, champs de formulaire) dans le repo
 * starter-kit — classes opt-in pour du HTML consommateur ordinaire (pas des
 * composants ar-*), déjà utilisées dans plusieurs variants de démo (dialog,
 * dropdown, charcounter, collapse, tooltip). La plupart des tokens qu'elles
 * consomment (--ar-button-*, --ar-input-*) sont déjà neutralisés côté
 * _global-tokens.css ; seul `buttons.css` a une couleur de texte :active
 * écrite en dur (voir derive-neutral-buttons-preset.js) qui nécessite une
 * correction propre au starter.
 */
export function syncPresets({ srcPresetsDir, repoPath }) {
    const destDir = path.join(repoPath, 'presets');
    mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(srcPresetsDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.css')) continue;
        const content = readFileSync(path.join(srcPresetsDir, entry.name), 'utf8');
        const out = entry.name === 'buttons.css' ? deriveNeutralButtonsPreset(content) : content;
        writeFileSync(path.join(destDir, entry.name), out);
    }
}
