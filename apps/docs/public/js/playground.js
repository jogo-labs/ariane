/**
 * playground.js
 *
 * Gère trois responsabilités :
 * 1. Coloration syntaxique — highlight.js colore tous les blocs au chargement
 * 2. Boutons "Copier" — copie le contenu du bloc code adjacent
 * 3. Playground interactif — les contrôles modifient les attributs du composant en live
 */

// ── Coloration syntaxique (highlight.js) ────────────────────────────────────

if (window.hljs) {
    window.hljs.highlightAll();
}

// ── Toggle thème local des previews ─────────────────────────────────────────

document.querySelectorAll('[data-preview-toggle]').forEach(function (btn) {
    var wrap = btn.closest('.preview-wrap');
    if (!wrap) return;
    var preview = wrap.querySelector('.preview');
    var sunIcon = btn.querySelector('.icon-sun');
    var moonIcon = btn.querySelector('.icon-moon');

    function syncIcons(isDark) {
        if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
        if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
    }
    syncIcons((preview && preview.getAttribute('data-theme')) === 'dark'); // état initial depuis le DOM

    btn.addEventListener('click', function () {
        var next = (preview.getAttribute('data-theme') || 'light') === 'dark' ? 'light' : 'dark';
        preview.setAttribute('data-theme', next);
        syncIcons(next === 'dark');
    });
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

    // Met à jour le bloc code et re-colore avec hljs
    function updateCode() {
        var el = preview.querySelector(tagName);
        if (!el || !codeEl) return;
        var html = el.outerHTML;
        codeEl.textContent = html; // textContent = texte brut, pas d'injection HTML
        codeEl.removeAttribute('data-highlighted'); // permet à hljs de re-coloriser
        if (window.hljs) window.hljs.highlightElement(codeEl);
    }

    // Synchroniser l'état initial des contrôles avec les attributs du composant rendu
    controls.forEach(function (ctrl) {
        var attr = ctrl.dataset.attr;
        if (!attr) return;
        var el = preview.querySelector(tagName);
        if (!el) return;
        if (ctrl.type === 'checkbox') {
            ctrl.checked = el.hasAttribute(attr);
        } else {
            var current = el.getAttribute(attr);
            if (current !== null) ctrl.value = current;
        }
    });

    // Écouter les changements sur les contrôles
    controls.forEach(function (ctrl) {
        var eventName = ctrl.type === 'checkbox' ? 'change' : 'input';
        ctrl.addEventListener(eventName, function () {
            var attr = ctrl.dataset.attr;
            if (!attr) return;
            var el = preview.querySelector(tagName);
            if (!el) return;
            if (ctrl.type === 'checkbox') {
                el.toggleAttribute(attr, ctrl.checked);
            } else if (ctrl.value === '') {
                el.removeAttribute(attr);
            } else {
                el.setAttribute(attr, ctrl.value);
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
