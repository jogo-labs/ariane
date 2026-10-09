/// <reference types="astro/client" />

declare module '@cem' {
    const manifest: unknown;
    export default manifest;
}

// Vercel Speed Insights types
interface Window {
    si?: (...args: unknown[]) => void;
    siq?: unknown[];
}
