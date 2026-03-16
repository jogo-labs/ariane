import { type ReactiveController, type ReactiveControllerHost } from 'lit';

export type ScrollTargetResolver = () => string[];

export class ScrollFollowController implements ReactiveController {
    private host: ReactiveControllerHost & HTMLElement;

    private observer?: IntersectionObserver | undefined;

    private enabled = false;

    private resolveTargets: ScrollTargetResolver;

    private lastVisible?: string;

    constructor(host: ReactiveControllerHost & HTMLElement, resolveTargets: ScrollTargetResolver) {
        this.host = host;
        this.resolveTargets = resolveTargets;

        host.addController(this);
    }

    hostDisconnected(): void {
        this.disconnect();
    }

    public setEnabled(value: boolean): void {
        if (this.enabled === value) return;

        this.enabled = value;

        if (value) {
            this.connect();
        } else {
            this.disconnect();
        }
    }

    public refresh(): void {
        if (!this.enabled) return;

        this.disconnect();
        this.connect();
    }

    private connect(): void {
        const ids = this.resolveTargets();
        if (!ids.length) return;

        this.observer = new IntersectionObserver(
            (entries) => {
                const entry = entries.find((e) => e.isIntersecting);
                const id = entry?.target?.id;
                if (!id || id === this.lastVisible) return;

                this.lastVisible = id;

                this.host.dispatchEvent(
                    new CustomEvent<string>('scroll-follow-change', {
                        detail: id,
                    }),
                );
            },
            {
                threshold: 0,
                rootMargin: '-40% 0px -40% 0px',
            },
        );

        ids.forEach((id) => {
            const el = document.getElementById(id);

            if (el) {
                this.observer?.observe(el);
            }
        });
    }

    private disconnect(): void {
        this.observer?.disconnect();
        this.observer = undefined;
    }
}
