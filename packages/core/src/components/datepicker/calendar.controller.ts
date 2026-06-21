import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { parse } from './date-parser.js';

export interface CalendarControllerOptions {
    min?: string;
    max?: string;
    isDateDisabled?: (date: Date) => boolean;
}

export class CalendarController implements ReactiveController {
    private readonly _host: ReactiveControllerHost;
    private _min: Date | undefined;
    private _max: Date | undefined;
    private _isDateDisabledFn: ((date: Date) => boolean) | undefined;

    currentViewMonth: Date;
    focusedDate: Date;
    selectedDate: Date | null = null;

    constructor(host: ReactiveControllerHost) {
        this._host = host;
        host.addController(this);
        const today = new Date();
        this.currentViewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        this.focusedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    hostConnected(): void {}
    hostDisconnected(): void {}

    update(opts: CalendarControllerOptions): void {
        this._min = opts.min ? (parse(opts.min, 'yyyy-MM-dd').date ?? undefined) : undefined;
        this._max = opts.max ? (parse(opts.max, 'yyyy-MM-dd').date ?? undefined) : undefined;
        this._isDateDisabledFn = opts.isDateDisabled;
    }

    previousMonth(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        this._host.requestUpdate();
    }

    nextMonth(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        this._host.requestUpdate();
    }

    previousYear(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear() - 1, d.getMonth(), 1);
        this._host.requestUpdate();
    }

    nextYear(): void {
        const d = this.currentViewMonth;
        this.currentViewMonth = new Date(d.getFullYear() + 1, d.getMonth(), 1);
        this._host.requestUpdate();
    }

    getGridWeeks(): Date[][] {
        const year = this.currentViewMonth.getFullYear();
        const month = this.currentViewMonth.getMonth();

        const firstOfMonth = new Date(year, month, 1);
        let dow = firstOfMonth.getDay();
        if (dow === 0) dow = 7;
        const gridStart = new Date(year, month, 1 - (dow - 1));

        const weeks: Date[][] = [];
        const cursor = new Date(gridStart);
        for (let w = 0; w < 6; w++) {
            const week: Date[] = [];
            for (let d = 0; d < 7; d++) {
                week.push(new Date(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
            weeks.push(week);
        }
        return weeks;
    }

    isDisabled(date: Date): boolean {
        const d = this._startOfDay(date);
        if (this._min && d < this._min) return true;
        if (this._max && d > this._max) return true;
        if (this._isDateDisabledFn?.(date)) return true;
        return false;
    }

    isToday(date: Date): boolean {
        return this.isSameDay(date, new Date());
    }

    isSameMonth(date: Date): boolean {
        return (
            date.getMonth() === this.currentViewMonth.getMonth() &&
            date.getFullYear() === this.currentViewMonth.getFullYear()
        );
    }

    private _startOfDay(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    isSameDay(a: Date, b: Date): boolean {
        return (
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()
        );
    }
}
