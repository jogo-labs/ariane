// Typage React : `@ariane-ui/core/react` augmente `JSX.IntrinsicElements`.
import '@ariane-ui/core/react';

export const ok = (
    <>
        <ar-dialog
            open
            label="Titre"
            mode="drawer"
            close-on-backdrop
            className="x"
            onar-dialog-hide={(e) => {
                const id: string | undefined = e.detail.id;
                void id;
            }}
        />
        <ar-datepicker value="2026-10-19" isDateDisabled={(d) => d.getDay() === 0} />
        <ar-pagination
            current={2}
            total={5}
            onar-pagination-page-change={(e) => void e.detail.to}
        />
    </>
);

export const ko = (
    <>
        {/* @ts-expect-error valeur hors de l'union */}
        <ar-dialog mode="nope" />
        {/* @ts-expect-error propriété inconnue */}
        <ar-dialog bogus />
        {/* @ts-expect-error détail inexistant */}
        <ar-dialog onar-dialog-hide={(e) => void e.detail.bogus} />
    </>
);
