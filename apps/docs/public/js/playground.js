/**
 * playground.js
 *
 * Gère quatre responsabilités :
 * 1. Coloration syntaxique — highlight.js colore tous les blocs au chargement
 * 2. Boutons "Copier" — copie le contenu du bloc code adjacent
 * 3. Playground interactif — les contrôles modifient les attributs du composant en live
 * 4. Accessibilité clavier des blocs de code qui débordent horizontalement
 *
 * Chargé en <script type="module"> (cf. Layout.astro/HomeLayout.astro) pour pouvoir
 * importer announceA11y du bundle /cdn/index.js, déjà chargé sur la même page.
 */

import { announceA11y } from '/cdn/index.js';

// Le mode `selector-tag` de la grammaire CSS de highlight.js ne reconnaît que
// les balises HTML/SVG standards (liste blanche figée dans sa regex) — un
// custom element (`ar-dialog`, `ar-alert`…) n'y figure jamais et ressort donc
// non coloré. Or c'est justement ce que ciblent quasiment tous les exemples
// CSS du site. On élargit la regex du mode existant (même className, mêmes
// styles --doc-code-tag déjà en place) plutôt que d'ajouter un mode : on
// garde le point d'insertion — juste avant l'alternative d'origine — pour
// que les vraies balises HTML continuent de matcher en premier. Le lookahead
// restreint le match à une position de sélecteur (avant `{`, `,`, `.`, `:`,
// `[`, `)`, un combinateur ou une fin de ligne) pour ne pas colorer un mot
// composé utilisé comme valeur de propriété (`sans-serif`, `border-box`…).
// Le `)` couvre `::part(header-actions)`/`:not(ar-dialog)` — sans lui, la
// liste blanche d'origine matchait quand même le préfixe "header" tout
// seul (elle le contient), coupant le mot en deux couleurs différentes.
function patchCssCustomElementSelectors() {
    var css = window.hljs && window.hljs.getLanguage && window.hljs.getLanguage('css');
    if (!css) return;
    var tagMode = css.contains.find(function (mode) {
        return mode.className === 'selector-tag';
    });
    if (!tagMode || tagMode._customElementPatched) return;
    // `begin` est ici une chaîne de pattern brute (pas encore compilée en
    // RegExp par highlight.js — ça n'arrive qu'à la première coloration) :
    // simple concaténation de motif, pas de `.source`/`.flags` à lire.
    var customElementPattern = '[a-z][a-z0-9]*(?:-[a-z0-9]+)+(?=[\\s,.:#[)>+~]|$)';
    tagMode.begin = customElementPattern + '|' + tagMode.begin;
    tagMode._customElementPatched = true;

    // L'argument de ::part(...) (ex. "header-actions" dans
    // ::part(header-actions)) n'est pas un nom de balise — c'est un nom de
    // part, un rôle sémantiquement différent qui mérite sa propre couleur
    // (--doc-code-part) plutôt que d'hériter de celle des tags via le motif
    // custom element ci-dessus. Mode dédié, inséré en tête de `contains`
    // pour être essayé AVANT le mode selector-tag à chaque position — sinon
    // ce dernier (élargi juste au-dessus pour matcher les mots composés)
    // capterait l'argument en premier. Le lookbehind ancre spécifiquement
    // sur "::part(" : un identifiant qui apparaît ailleurs entre parenthèses
    // (":not(ar-dialog)") reste donc bien coloré comme un tag, pas comme un
    // nom de part.
    css.contains.unshift({
        className: 'selector-part',
        begin: '(?<=::part\\()[a-zA-Z][a-zA-Z0-9-]*(?=\\))',
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // ── Coloration syntaxique (highlight.js) ────────────────────────────────────

    if (window.hljs) {
        patchCssCustomElementSelectors();
        window.hljs.highlightAll();
    }

    // ── Accessibilité clavier des <pre> scrollables (WCAG 2.1.1) ────────────────
    // Tous les blocs de code ont overflow-x:auto (doc-prose.css/Playground.astro) —
    // rendus focusables inconditionnellement plutôt que de tester scrollWidth vs
    // clientWidth, qui peut être en course avec le layout/la coloration syntaxique.
    // axe-core (règle scrollable-region-focusable) cible le <code> lui-même —
    // plus large que son <pre> parent une fois coloré par highlight.js — pas
    // seulement le <pre> : un ancêtre focusable ne suffit pas pour cette règle.

    document.querySelectorAll('pre').forEach(function (pre) {
        pre.setAttribute('tabindex', '0');
        var code = pre.querySelector('code');
        if (code) code.setAttribute('tabindex', '0');
    });

    // ── Boutons Copier (blocs variantes) ────────────────────────────────────────
    // Les boutons changent leur propre texte visuellement ("Copié !"), mais un
    // changement de libellé sur l'élément qui a le focus n'est pas annoncé de
    // façon fiable par tous les lecteurs d'écran — announceA11y (packages/core)
    // rend l'annonce explicite via une zone aria-live partagée, indépendamment
    // du focus.

    document.querySelectorAll('[data-copy]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var block = btn.closest('.code-block');
            if (!block) return;
            var codeEl = block.querySelector('pre code');
            if (!codeEl) return;

            navigator.clipboard
                .writeText(codeEl.textContent || '')
                .then(function () {
                    btn.textContent = 'Copié !';
                    btn.classList.add('copied');
                    announceA11y('Code copié dans le presse-papiers.');
                    setTimeout(function () {
                        btn.textContent = 'Copier';
                        btn.classList.remove('copied');
                    }, 2000);
                })
                .catch(function () {
                    var range = document.createRange();
                    range.selectNodeContents(codeEl);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                });
        });
    });

    // ── Playground interactif ──────────────────────────────────────────────────

    document.querySelectorAll('[data-playground]').forEach(function (section) {
        var tagName = section.dataset.tagName;
        var preview = section.querySelector('[data-playground-preview]');
        var controls = section.querySelectorAll('[data-playground-ctrl]');
        var codeEl = section.querySelector('[data-playground-code]');

        if (!preview || !tagName) return;

        // Template de référence — capturé une seule fois, avant tout attribut runtime
        var originalHtml = codeEl ? codeEl.textContent.trim() : '';

        // Met à jour le bloc code depuis le template original, sans attributs runtime
        function updateCode() {
            if (!codeEl) return;
            var parser = new DOMParser();
            var doc = parser.parseFromString('<body>' + originalHtml + '</body>', 'text/html');
            var templateEl = doc.body.querySelector(tagName);
            if (templateEl) {
                controls.forEach(function (c) {
                    var attr = c.dataset.attr;
                    if (!attr) return;
                    if (c.type === 'checkbox') {
                        if (c.checked) templateEl.setAttribute(attr, '');
                        else templateEl.removeAttribute(attr);
                    } else if (c.value !== '') {
                        templateEl.setAttribute(attr, c.value);
                    } else {
                        templateEl.removeAttribute(attr);
                    }
                });
            }
            var html = doc.body.innerHTML.trim();
            // Le DOM sérialise les attributs booléens en attr="" — on corrige en attr seul
            controls.forEach(function (c) {
                if (c.type === 'checkbox' && c.dataset.attr) {
                    html = html.replace(
                        new RegExp(' ' + c.dataset.attr + '=""', 'g'),
                        ' ' + c.dataset.attr,
                    );
                }
            });
            codeEl.textContent = html;
            codeEl.removeAttribute('data-highlighted');
            if (window.hljs) window.hljs.highlightElement(codeEl);
        }

        // Synchroniser les contrôles depuis les attributs du composant (init + changements)
        var compEl = preview.querySelector(tagName);
        var controlledAttrs = Array.from(controls).map(function (c) {
            return c.dataset.attr;
        });

        function syncControlsFromComponent() {
            if (!compEl) return;
            controls.forEach(function (ctrl) {
                var attr = ctrl.dataset.attr;
                if (!attr) return;
                if (ctrl.type === 'checkbox') {
                    ctrl.checked = compEl.hasAttribute(attr);
                } else {
                    var val = compEl.getAttribute(attr);
                    if (val !== null) ctrl.value = val;
                }
            });
        }

        syncControlsFromComponent();
        updateCode();

        // Observer les changements d'attributs du composant pour maintenir la sync.
        // updateCode() n'est déclenché que si un attribut contrôlé change (pas open/aria-*).
        if (compEl) {
            new MutationObserver(function (mutations) {
                var controlledChanged = mutations.some(function (m) {
                    return controlledAttrs.indexOf(m.attributeName) !== -1;
                });
                syncControlsFromComponent();
                if (controlledChanged) updateCode();
            }).observe(compEl, { attributes: true });
        }

        // Écouter les changements sur les contrôles
        controls.forEach(function (ctrl) {
            var eventName = ctrl.type === 'checkbox' ? 'change' : 'input';
            ctrl.addEventListener(eventName, function () {
                var attr = ctrl.dataset.attr;
                if (!attr || !compEl) return;
                if (ctrl.type === 'checkbox') {
                    compEl.toggleAttribute(attr, ctrl.checked);
                } else if (ctrl.value === '') {
                    compEl.removeAttribute(attr);
                } else {
                    compEl.setAttribute(attr, ctrl.value);
                }
                updateCode();
            });
        });

        // Bouton copier du playground
        var copyBtn = section.querySelector('[data-copy-playground]');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                var text = codeEl ? codeEl.textContent || '' : '';
                navigator.clipboard
                    .writeText(text)
                    .then(function () {
                        copyBtn.textContent = 'Copié !';
                        copyBtn.classList.add('copied');
                        announceA11y('Code copié dans le presse-papiers.');
                        setTimeout(function () {
                            copyBtn.textContent = 'Copier';
                            copyBtn.classList.remove('copied');
                        }, 2000);
                    })
                    .catch(function () {
                        if (codeEl) {
                            var range = document.createRange();
                            range.selectNodeContents(codeEl);
                            window.getSelection().removeAllRanges();
                            window.getSelection().addRange(range);
                        }
                    });
            });
        }
    });
});
