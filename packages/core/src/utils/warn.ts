export function warn(tag: string, message: string): void {
    if (__DEV__) {
        console.warn(`[${tag}] ${message}`);
    }
}
