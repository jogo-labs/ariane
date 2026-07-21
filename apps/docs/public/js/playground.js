/**
 * playground.js
 *
 * Gère quatre responsabilités :
 * 1. Coloration syntaxique — highlight.js colore tous les blocs au chargement
 * 2. Boutons "Copier" — copie le contenu du bloc code adjacent
 * 3. Playground interactif — les contrôles modifient les attributs du composant en live
 * 4. Accessibilité clavier des blocs de code qui débordent horizontalement
 */

document.addEventListener('DOMContentLoaded', function () {
    // ── Coloration syntaxique (highlight.js) ────────────────────────────────────

    if (window.hljs) {
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
