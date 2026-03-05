import {A, createAsync, RouteSectionProps, useNavigate} from "@solidjs/router";
import NavBarTemplate from "~/app/common/NavBarTemplate";
import {ElementStyleProvider, useElementStyleScope} from "~/app/elements/repository/ElementStyleStore";
import {getElementStylesQuery} from "~/app/elements/repository/ElementStyleRepository";
import {ElementsEditorItems} from "~/app/elements/ElementsEditorItems/ElementsEditorItems";
import {createEffect, createSignal, on, onCleanup, onMount, Show, Suspense} from "solid-js";

export default function ElementsEditor(props: RouteSectionProps<undefined>) {

    const themeId = props.params.themeId
    const elementStyleDeltas = createAsync(async () => {
        if (themeId == null) return undefined
        return getElementStylesQuery(themeId)
    })

    const navigate = useNavigate()

    function goBack() {
        navigate(-1)
    }

    const sectionIds = ["inputStyles", "buttonStyles", "cardStyles", "listStyles"] as const;
    type SectionId = (typeof sectionIds)[number];

    const [activeSection, setActiveSection] = createSignal<string | null>(null);
    let [scrollContainer, setScrollContainer] = createSignal<HTMLDivElement | null>(null);

    function activeClass(id: string) {
        return activeSection() === id ? "active" : "";
    }

    createEffect(on(scrollContainer, (el) => {
        if (!el) return;

        const hash = window.location.hash.replace("#", "") as SectionId | "";
        if (hash && sectionIds.includes(hash)) {
            setActiveSection(hash);
        } else {
            updateActiveSection();
        }

        el?.addEventListener("scroll", handleScroll, {passive: true});
    }))

    function updateActiveSection() {
        const container = scrollContainer();
        if (!container) return;

        const containerRect = container.getBoundingClientRect();

        let bestId: SectionId | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        sectionIds.forEach((id) => {
            const el = container.querySelector<HTMLElement>(`#${id}`);
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const distance = Math.abs(rect.top - containerRect.top); // distance from container top

            if (distance < bestDistance) {
                bestDistance = distance;
                bestId = id;
            }
        });

        if (bestId && bestId !== activeSection()) {
            setActiveSection(bestId);
            // optional: sync URL hash
            history.replaceState(null, "", `#${bestId}`);
        }
    }


    function handleScroll() {
        updateActiveSection();
    }

    function scrollToSection(id: SectionId) {
        const el = scrollContainer()?.querySelector<HTMLElement>(`#${id}`);
        if (!el) return;
        el.scrollIntoView({behavior: "smooth", block: "start"});
        setActiveSection(id);
        history.replaceState(null, "", `#${id}`);
    }

    onMount(() => {
        onCleanup(() => scrollContainer()?.removeEventListener("scroll", handleScroll));
    });

    return <Suspense>
        <ElementStyleProvider themeId={themeId!!} deltas={elementStyleDeltas()} use={useElementStyleScope}>
        {({elementStyles, cssContent}) => <div grid-cols={"[20rem,1fr]"} sizing={"h-full"}>
            <NavBarTemplate prepend={<button class={"icon flat surface"} sizing={"w-2.5rem h-2.5rem"}
                                             spacing={"ma-0.5rem"}
                                             flex={"row center justify-center"} onClick={goBack}>
                                <i>arrow_back</i>
                            </button>}>

                <section spacing={"ml-0.75rem"} flex={"col gap-3"}>
                    <h2>Elements Editor</h2>
                    <ul class={"nav"} flex={"col gap-1"}>
                        <li onClick={() => scrollToSection("inputStyles")} class={activeClass("inputStyles")}>
                            Inputs
                        </li>
                        <li onClick={() => scrollToSection("buttonStyles")} class={activeClass("buttonStyles")}>
                            Buttons
                        </li>
                        <li onClick={() => scrollToSection("cardStyles")} class={activeClass("cardStyles")}>
                            Cards
                        </li>
                        <li onClick={() => scrollToSection("listStyles")} class={activeClass("listStyles")}>
                            Lists
                        </li>
                    </ul>
                </section>
            </NavBarTemplate>
            <div ref={setScrollContainer} sizing={"h-full"} style={"overflow-y: auto"}>
                <ElementsEditorItems styles={elementStyles}/>
            </div>
            <style>

                {// language=CSS
                    `@scope (.elementsPreview) {
                         ${cssContent()}
                     }
                    `}
            </style>
        </div>}
    </ElementStyleProvider>
    </Suspense>
}
