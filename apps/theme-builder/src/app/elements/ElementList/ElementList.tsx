import {For} from "solid-js";
import {useNavigate} from "@web/router";
import {useElementListScope} from "./ElementListScope";
import {elementCategories} from "../elementCategories";
import styles from "./ElementList.module.css";

export function ElementList() {
    const {theme} = useElementListScope();
    const navigate = useNavigate();

    function onCategoryClicked(categoryType: string) {
        navigate(`/editor/${theme().id}/elements/${categoryType}`);
    }

    function renderPreview(type: string) {
        switch (type) {
            case "input":
                return (
                    <div class="flex flex-col gap-2 w-full max-w-xs transform-[translateX(calc(50%))_scale(1.4)]">
                        <label class="labelSm">Username</label>
                        <input class="outlined p-2 w-full" placeholder="Enter text..." />
                    </div>
                );
            case "button":
                return (
                    <div class="flex gap-2 transform-[scale(1.2)]">
                        <button class="elevated">Primary</button>
                        <button class="outlined">Secondary</button>
                    </div>
                );
            case "card":
                return (
                    <div class="grid grid-cols-1">
                        <article class="tonal col-start-1 row-start-1 p-4 w-70 transform-[translate(0px,10px)]">
                            <hgroup class="flex flex-col gap-2 mb-2">
                                <h4 class="p-0">Card Title</h4>
                            </hgroup>
                            <empty-state class="skeleton">
                                <div class="h-3 w-full mb-1" />
                                <div class="h-3 w-2/3 mb-1" />
                                <div class="h-3 w-full mb-1" />
                            </empty-state>
                        </article>
                        <article class="elevated col-start-1 row-start-1 p-4 w-70 transform-[translate(30px,40px)]">
                            <hgroup class="flex flex-col gap-2 mb-2">
                                <h4 class="p-0">Card Title</h4>
                            </hgroup>
                            <empty-state class="skeleton">
                                <div class="h-3 w-full mb-1" />
                                <div class="h-3 w-2/3 mb-1" />
                                <div class="h-3 w-full mb-1" />
                            </empty-state>
                        </article>
                    </div>
                );
            case "list":
                return (
                    <empty-state class="skeleton flex flex-col gap-1 w-48">
                        <div class="outlined p-2 flex items-center gap-2">
                            <div class="h-2 w-2" />
                            <div class="h-2 w-full" />
                        </div>
                        <div class="outlined p-2 flex items-center gap-2">
                            <div class="h-2 w-2" />
                            <div class="h-2 w-full" />
                        </div>
                    </empty-state>
                );
            case "tab":
                return (
                    <ul role="tablist" class="flex gap-2 p-1 underlined w-fit rounded transform-[scale(1.5)]">
                        <li class="active flat px-3 py-1 text-xs rounded">Tab 1</li>
                        <li class="text px-3 py-1 text-xs rounded">Tab 2</li>
                        <li class="text px-3 py-1 text-xs rounded">Tab 3</li>
                    </ul>
                );
            default:
                return null;
        }
    }

    return (
        <div class={"flex flex-col gap-8 p-8"}>
            <hgroup class={"flex flex-col gap-1"}>
                <h2 class={"titleLg"}>UI Elements</h2>
                <p class={"bodySm label"}>Configure the visual style of your component library</p>
            </hgroup>

            <div class={"grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6"}>
                <For each={elementCategories}>
                    {(category) => (
                        <article
                            role="button"
                            class={"elevated flex flex-col gap-4 p-6"}
                            onClick={() => onCategoryClicked(category.type)}
                        >
                            <hgroup class={"flex items-center gap-4"}>
                                <div class={"flex h-12 w-12 items-center justify-center"}>
                                    <i class={"title"}>{category.icon}</i>
                                </div>
                                <div class={"flex flex-col gap-0"}>
                                    <span class={"titleMd"}>{category.name}</span>
                                    <span class={"bodySm label"}>{category.description}</span>
                                </div>
                            </hgroup>

                            <article class={`previewContainer inset ${styles.previewContainer} flex h-32 w-full items-center justify-center`}>
                                <div class={styles.previewContent}>
                                    {renderPreview(category.preview)}
                                </div>
                            </article>
                        </article>
                    )}
                </For>
            </div>
        </div>
    );
}
