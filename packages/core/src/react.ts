/**
 * Types React (opt-in, types seulement) : `import '@ariane-ui/core/react'` une fois dans le projet
 * (par exemple dans un fichier `.d.ts` ou `main.tsx`) pour typer `<ar-… />` dans le JSX, ses
 * propriétés, ses attributs et ses props d'événements `onar-…` (React 19).
 *
 * Les types portent sur les balises par défaut (`ar-*`). Source : `types/elements.generated.ts`.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
    ArianeElementEventNames,
    ArianeElementProps,
    ArianeElements,
    ArianeEventMap,
} from './types/elements.generated.js';

type ReactEvents<Tag extends keyof ArianeElements> = {
    [K in ArianeElementEventNames[Tag] as `on${K}`]?: (event: ArianeEventMap[K]) => void;
};

type ArianeIntrinsicElements = {
    [Tag in keyof ArianeElements]: Omit<
        DetailedHTMLProps<HTMLAttributes<ArianeElements[Tag]>, ArianeElements[Tag]>,
        keyof ArianeElementProps[Tag]
    > &
        ArianeElementProps[Tag] &
        ReactEvents<Tag>;
};

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface IntrinsicElements extends ArianeIntrinsicElements {}
    }
}
