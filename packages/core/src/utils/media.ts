/** Returns true if the user has requested reduced motion via OS/browser settings. */
export const prefersReducedMotion = (): boolean =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
