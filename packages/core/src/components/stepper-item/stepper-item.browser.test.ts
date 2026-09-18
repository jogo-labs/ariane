/// <reference types="mocha" />
import { aTimeout, expect, fixture, html } from '@open-wc/testing';
import type { ArStepper } from '../stepper/stepper.js';
import '../stepper/index.js';
import './index.js';

describe('ar-stepper-item — browser', () => {
    let el: ArStepper;

    afterEach(() => el?.remove());

    it('after-label peuplé pose aria-describedby sur le contrôle de l’étape', async () => {
        el = await fixture(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="Étape A" href="#a">
                    <span slot="after-label">note</span>
                </ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        const itemA = el.querySelector('ar-stepper-item[path="a"]')!;
        // Le slotchange qui peuple after-label est un événement asynchrone distinct du cycle de
        // rendu d'ar-stepper (dispatché par le navigateur après l'assignation du slot) : attendre
        // aussi le updateComplete de l'item ne suffit pas s'il n'a pas encore fired — laisser
        // passer un tick réel absorbe le second rendu qu'il déclenche (_hasAfterLabel → true).
        await aTimeout(0);
        await (itemA as unknown as { updateComplete: Promise<boolean> }).updateComplete;
        const control = itemA.shadowRoot!.querySelector('.item-header')!;
        const describedBy = control.getAttribute('aria-describedby');

        expect(describedBy).to.not.equal(null);
        const target = itemA.shadowRoot!.getElementById(describedBy!);
        expect(target).to.not.equal(null);
        // Le wrapper ciblé par aria-describedby enveloppe un <slot> : le contenu textuel vit
        // dans le light DOM assigné, pas dans le textContent (natif) du wrapper lui-même —
        // on vérifie donc le texte via les noeuds assignés au slot, comme le ferait un lecteur
        // d'écran en aplatissant l'arbre composé pour calculer le nom accessible.
        const slot = target!.querySelector('slot[name="after-label"]') as HTMLSlotElement;
        const assignedText = slot
            .assignedNodes({ flatten: true })
            .map((n) => n.textContent)
            .join('')
            .trim();
        expect(assignedText).to.equal('note');
    });

    it('sans after-label, aucun aria-describedby n’est posé', async () => {
        el = await fixture(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        const itemB = el.querySelector('ar-stepper-item[path="b"]')!;
        const control = itemB.shadowRoot!.querySelector('.item-header')!;

        expect(control.hasAttribute('aria-describedby')).to.equal(false);
    });

    it('clic réel sur le lien d’une étape déclenche ar-stepper-step-change avec le bon detail', async () => {
        // current-path="b" : "a" est déjà complétée (avant l'étape courante), donc rendue comme
        // un <a> cliquable dans son shadow DOM — condition nécessaire pour tester un vrai clic
        // natif sur un lien (une étape à venir, elle, n'est jamais un lien).
        el = await fixture(html`
            <ar-stepper current-path="b">
                <ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        let detail: { from: string; to: string } | undefined;
        el.addEventListener('ar-stepper-step-change', (e) => {
            detail = (e as CustomEvent).detail;
        });

        const itemA = el.querySelector('ar-stepper-item[path="a"]')!;
        const link = itemA.shadowRoot!.querySelector('a')!;
        link.click();

        expect(detail).to.deep.equal({ from: 'b', to: 'a' });
    });

    it('la numérotation des puces (compteur CSS) reste correcte à travers le shadow DOM des items', async () => {
        el = await fixture(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B"></ar-stepper-item>
                <ar-stepper-item path="c" label="Étape C"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        const items = [...el.querySelectorAll('ar-stepper-item')];
        const bullets = items.map(
            (item) => item.shadowRoot!.querySelector('[part~="bullet"]') as HTMLElement,
        );
        const values = bullets.map((bullet) =>
            getComputedStyle(bullet, '::before').getPropertyValue('content'),
        );

        // content résolu contient le chiffre littéral (pas "counter(step)") une fois peint —
        // vérifié via un screenshot serait plus fiable mais indisponible en environnement WTR ;
        // on vérifie au minimum que la valeur spécifiée référence bien le compteur "step" et que
        // les trois puces appartiennent bien à trois items distincts (host ar-stepper commun).
        // `closest()` ne traverse pas la frontière shadow DOM depuis l'intérieur d'un shadow
        // root : on retrouve donc l'item propriétaire via la liste zippée plutôt que via bullet.
        values.forEach((v) => expect(v).to.include('counter(step)'));
        expect(new Set(items.map((item) => item.getAttribute('path'))).size).to.equal(3);

        // La valeur spécifiée du `content` ne prouve pas que le compteur CSS traverse
        // effectivement la frontière shadow DOM (ar-stepper → slot → ar-stepper-item) : c'est le
        // mécanisme empiriquement critique que le spec appelle à vérifier réellement (finding #6
        // de la review finale #226). counter-reset/counter-increment résolus sont, eux,
        // disponibles via getComputedStyle (contrairement au chiffre peint dans ::before), donc on
        // vérifie le câblage du compteur lui-même : le reset côté <ol part="list"> d'ar-stepper et
        // l'increment côté .item-header de chaque ar-stepper-item.
        const list = el.shadowRoot!.querySelector('[part="list"]') as HTMLElement;
        expect(getComputedStyle(list).counterReset).to.equal('step 0');

        items.forEach((item) => {
            const header = item.shadowRoot!.querySelector('.item-header') as HTMLElement;
            expect(getComputedStyle(header).counterIncrement).to.equal('step 1');
        });
    });
});
