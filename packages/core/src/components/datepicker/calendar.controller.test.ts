import { describe, expect, it, vi } from 'vitest';
import { CalendarController } from './calendar.controller.js';

function makeHost() {
    return { addController: vi.fn(), requestUpdate: vi.fn() };
}

describe('CalendarController', () => {
    describe('getGridWeeks', () => {
        it('retourne toujours 6 semaines de 7 jours', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            const weeks = ctrl.getGridWeeks();
            expect(weeks).toHaveLength(6);
            weeks.forEach((w) => expect(w).toHaveLength(7));
        });

        it('commence le lundi précédant le 1er du mois', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            const firstDay = ctrl.getGridWeeks()[0][0];
            expect(firstDay.getDay()).toBe(1);
        });

        it('inclut des jours du mois précédent quand le mois commence un mercredi', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 6, 1);
            const firstDay = ctrl.getGridWeeks()[0][0];
            expect(firstDay.getMonth()).toBe(5);
            expect(firstDay.getDate()).toBe(29);
        });

        it('la dernière cellule est toujours un dimanche', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            const weeks = ctrl.getGridWeeks();
            const lastDay = weeks[5][6];
            expect(lastDay.getDay()).toBe(0);
        });
    });

    describe('navigation', () => {
        it('previousMonth passe au mois précédent', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            ctrl.previousMonth();
            expect(ctrl.currentViewMonth.getMonth()).toBe(4);
            expect(host.requestUpdate).toHaveBeenCalled();
        });

        it("previousMonth en janvier passe à décembre de l'année précédente", () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 0, 1);
            ctrl.previousMonth();
            expect(ctrl.currentViewMonth.getMonth()).toBe(11);
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2025);
        });

        it('nextMonth passe au mois suivant', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 11, 1);
            ctrl.nextMonth();
            expect(ctrl.currentViewMonth.getMonth()).toBe(0);
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2027);
        });

        it("previousYear décrémente l'année", () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            ctrl.previousYear();
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2025);
            expect(ctrl.currentViewMonth.getMonth()).toBe(5);
        });

        it("nextYear incrémente l'année", () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            ctrl.nextYear();
            expect(ctrl.currentViewMonth.getFullYear()).toBe(2027);
        });
    });

    describe('isDisabled', () => {
        it('retourne false par défaut', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            expect(ctrl.isDisabled(new Date(2026, 5, 12))).toBe(false);
        });

        it('retourne true si avant min', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.update({ min: '2026-06-10' });
            expect(ctrl.isDisabled(new Date(2026, 5, 9))).toBe(true);
            expect(ctrl.isDisabled(new Date(2026, 5, 10))).toBe(false);
        });

        it('retourne true si après max', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.update({ max: '2026-06-20' });
            expect(ctrl.isDisabled(new Date(2026, 5, 21))).toBe(true);
            expect(ctrl.isDisabled(new Date(2026, 5, 20))).toBe(false);
        });

        it('délègue au callback isDateDisabled', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.update({ isDateDisabled: (d) => d.getDay() === 0 });
            expect(ctrl.isDisabled(new Date(2026, 5, 7))).toBe(true);
            expect(ctrl.isDisabled(new Date(2026, 5, 8))).toBe(false);
        });
    });

    describe('isToday', () => {
        it('retourne true uniquement pour la date du jour', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            const today = new Date();
            expect(ctrl.isToday(today)).toBe(true);
            expect(ctrl.isToday(new Date(2000, 0, 1))).toBe(false);
        });
    });

    describe('isSameMonth', () => {
        it('retourne true pour les dates du mois affiché', () => {
            const host = makeHost();
            const ctrl = new CalendarController(host as never);
            ctrl.currentViewMonth = new Date(2026, 5, 1);
            expect(ctrl.isSameMonth(new Date(2026, 5, 15))).toBe(true);
            expect(ctrl.isSameMonth(new Date(2026, 4, 31))).toBe(false);
        });
    });
});
