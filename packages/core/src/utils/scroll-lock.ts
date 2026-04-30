interface _Entry {
    count: number;
    overflowY: string;
    overflowX: string;
}

const _registry = new Map<HTMLElement, _Entry>();

export function acquireScrollLock(el: HTMLElement): void {
    const entry = _registry.get(el);
    if (!entry) {
        _registry.set(el, {
            count: 1,
            overflowY: el.style.overflowY,
            overflowX: el.style.overflowX,
        });
        el.style.overflowY = 'hidden';
        el.style.overflowX = 'hidden';
    } else {
        entry.count++;
    }
}

export function releaseScrollLock(el: HTMLElement): void {
    const entry = _registry.get(el);
    if (!entry) return;
    entry.count--;
    if (entry.count === 0) {
        el.style.overflowY = entry.overflowY;
        el.style.overflowX = entry.overflowX;
        _registry.delete(el);
    }
}

export function isScrollLocked(el: HTMLElement): boolean {
    return _registry.has(el);
}
