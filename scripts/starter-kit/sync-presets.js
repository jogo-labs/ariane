import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Copie les presets CSS (boutons, champs de formulaire) verbatim dans le
 * repo starter-kit — classes opt-in pour du HTML consommateur ordinaire
 * (pas des composants ar-*), déjà utilisées dans plusieurs variants de démo
 * (dialog, dropdown, charcounter, collapse, tooltip). Aucune neutralisation
 * nécessaire : elles consomment les mêmes tokens --ar-button-* et --ar-input-*
 * déjà copiés verbatim dans _global-tokens.css.
 */
export function syncPresets({ srcPresetsDir, repoPath }) {
    const destDir = path.join(repoPath, 'presets');
    mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(srcPresetsDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.css')) continue;
        writeFileSync(
            path.join(destDir, entry.name),
            readFileSync(path.join(srcPresetsDir, entry.name), 'utf8'),
        );
    }
}
