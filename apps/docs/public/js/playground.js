/**
 * playground.js
 *
 * Gère trois responsabilités :
 * 1. Coloration syntaxique — highlight.js colore tous les blocs au chargement
 * 2. Boutons "Copier" — copie le contenu du bloc code adjacent
 * 3. Playground interactif — les contrôles modifient les attributs du composant en live
 */

document.addEventListener('DOMContentLoaded', function () {
    // ── Coloration syntaxique (highlight.js) ────────────────────────────────────

    if (window.hljs) {
        window.hljs.highlightAll();
    }

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

        // Met à jour le bloc code et re-colore avec hljs
        function updateCode() {
            if (!codeEl) return;
            // Capture le HTML complet de la preview (bouton déclencheur + composant)
            var html = preview.innerHTML.trim();
            // Le DOM sérialise les attributs booléens en attr="" — on corrige en attr seul
            controls.forEach(function (c) {
                if (c.type === 'checkbox' && c.dataset.attr) {
                    html = html.replace(
                        new RegExp(' ' + c.dataset.attr + '=""', 'g'),
                        ' ' + c.dataset.attr,
                    );
                }
            });
            codeEl.textContent = html; // textContent = texte brut, pas d'injection HTML
            codeEl.removeAttribute('data-highlighted'); // permet à hljs de re-coloriser
            if (window.hljs) window.hljs.highlightElement(codeEl);
        }

        // Synchroniser les contrôles depuis les attributs du composant (init + changements)
        var compEl = preview.querySelector(tagName);

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

        // Observer les changements d'attributs du composant pour maintenir la sync
        if (compEl) {
            new MutationObserver(function () {
                syncControlsFromComponent();
                updateCode();
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
