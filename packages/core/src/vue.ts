/**
 * Types Vue (opt-in, types seulement) : `import '@ariane-ui/core/vue'` une fois dans le projet
 * pour typer `<ar-… />` dans les gabarits (`GlobalComponents`), avec ses propriétés et ses
 * événements (`@ar-dialog-hide`, typés `onArDialogHide`).
 *
 * Les types portent sur les balises par défaut (`ar-*`). Source : `types/elements.generated.ts`.
 */
import type { DefineComponent, HTMLAttributes } from 'vue';
import type {
    ArianeElementEventNames,
    ArianeElementProps,
    ArianeElements,
    ArianeEventMap,
} from './types/elements.generated.js';

type Camelize<S extends string> = S extends `${infer Head}-${infer Tail}`
    ? `${Head}${Capitalize<Camelize<Tail>>}`
    : S;

type VueEvents<Tag extends keyof ArianeElements> = {
    [K in ArianeElementEventNames[Tag] as `on${Capitalize<Camelize<K>>}`]?: (
        event: ArianeEventMap[K],
    ) => void;
};

// Les attributs HTML globaux (`id`, `role`, `aria-*`…) restent permis, comme sur un élément natif :
// sans eux, `strictTemplates` les refuse sur un composant déclaré par `GlobalComponents`.
type ArianeVueComponents = {
    [Tag in keyof ArianeElements]: DefineComponent<
        Omit<HTMLAttributes, keyof ArianeElementProps[Tag]> &
            ArianeElementProps[Tag] &
            VueEvents<Tag>
    >;
};

declare module 'vue' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface GlobalComponents extends ArianeVueComponents {}
}
