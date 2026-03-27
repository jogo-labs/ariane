/// <reference types="mocha" />
import { expect } from '@open-wc/testing';
import { ScrollFollowController } from './scroll-follow.controller.js';

// Hôte minimal compatible ReactiveControllerHost
function makeHost() {
    const host = document.createElement('div');
    const controllers: object[] = [];
    (host as unknown as { addController: (c: object) => void }).addController = (c) => {
        controllers.push(c);
    };
    (host as unknown as { removeController: (c: object) => void }).removeController = (c) => {
        const i = controllers.indexOf(c);
        if (i !== -1) controllers.splice(i, 1);
    };
    document.body.appendChild(host);
    return host as HTMLElement & {
        addController: (c: object) => void;
        removeController: (c: object) => void;
    };
}

// Crée un élément avec un id donné
function makeSection(id: string) {
    const el = document.createElement('section');
    el.id = id;
    el.style.height = '200px';
    document.body.appendChild(el);
    return el;
}

describe('ScrollFollowController', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('instancie sans erreur dans un vrai browser', () => {
        const host = makeHost();
        const controller = new ScrollFollowController(host, () => []);
        expect(controller).to.not.equal(null);
    });

    it('IntersectionObserver est disponible dans Chromium', () => {
        expect(window.IntersectionObserver).to.not.equal(undefined);
    });

    it("setEnabled(true) ne lance pas d'erreur quand les cibles existent", () => {
        const host = makeHost();
        makeSection('section-a');
        const controller = new ScrollFollowController(host, () => ['section-a']);
        expect(() => controller.setEnabled(true)).to.not.throw();
    });

    it("ne déclenche pas d'événement quand la liste de cibles est vide", () => {
        const host = makeHost();
        let eventFired = false;
        host.addEventListener('scroll-follow-change', () => {
            eventFired = true;
        });

        const controller = new ScrollFollowController(host, () => []);
        controller.setEnabled(true);

        expect(eventFired).to.equal(false);
    });

    it('setEnabled(true) deux fois est sans effet (idempotent)', () => {
        const host = makeHost();
        makeSection('section-b');
        const controller = new ScrollFollowController(host, () => ['section-b']);

        expect(() => {
            controller.setEnabled(true);
            controller.setEnabled(true);
        }).to.not.throw();
    });

    it("refresh() après setEnabled(false) ne lance pas d'erreur", () => {
        const host = makeHost();
        makeSection('section-c');
        const controller = new ScrollFollowController(host, () => ['section-c']);

        controller.setEnabled(true);
        controller.setEnabled(false);

        expect(() => controller.refresh()).to.not.throw();
    });
});
