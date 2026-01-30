import ElementsTemplate from "~/app/elements/components/ElementsTemplate";
import ElementCssEditor from "~/app/elements/components/ElementCssEditor";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {useElementStyleStore} from "~/app/elements/repository/ElementStyleStore";
import {debounce} from "@web/utils";


export function ElementsEditorItems(props: { styles: ElementStyleDefinition[] }) {
    const { updateCss, save, addInputVariant, addButtonVariant, addCardVariant, addListVariant } = useElementStyleStore()

    const debouncedUpdateCss = debounce(updateCss, 1000)
    const debouncedSave = debounce(save, 4000)

    function onCssChanged(value: string, style: ElementStyleDefinition) {
        const lines = value.split('\n');
        const trimmedValue = lines.slice(1, -1).join('\n');

        debouncedUpdateCss(style.id, trimmedValue)
        debouncedSave(style.id)
    }

    return <div class={"surface"} flex={"col gap-8"}>
        <div id={"inputStyles"} spacing={"mx-8 my-6"}>
            <h3>Input</h3>
            <ElementsTemplate
                styles={props.styles.filter(style => style.element === 'input')}
                onAddVariant={(name) => { addInputVariant(name) }}
                controls={(style) => <>
                        <div grid="cols-[1fr]" sizing="h-full">
                            <ElementCssEditor
                                selector={`.${style.variant}`}
                                content={style.css}
                                onChange={(value) => onCssChanged(value, style)} onBlur={() => save(style.id)}/>
                        </div>
                    </>}
                example={(style) => <>
                <div flex={"col gap-4"}>
                    <div>
                        <input class={style.variant}/>
                    </div>
                </div>
                </>}
            />
        </div>
        <div id={"buttonStyles"} spacing={"mx-8 my-6"}>
            <h3>Button</h3>
            <ElementsTemplate
                styles={props.styles.filter(style => style.element === 'button')}
                onAddVariant={(name) => { addButtonVariant(name) }}
                controls={(style) => <>
                        <div grid="cols-[1fr]" sizing="h-full">
                            <ElementCssEditor
                                selector={`.${style.variant}`}
                                content={style.css}
                                onChange={(value) => onCssChanged(value, style)} onBlur={() => save(style.id)}/>
                        </div>
                    </>}
                example={(style) => <>
                <div flex={"col gap-4"}>
                    <button class={style.variant}>Button Text</button>
                </div>
                </>}
            />
        </div>
        <div id={"cardStyles"} spacing={"mx-8 my-6"}>
            <h3>Cards</h3>
            <ElementsTemplate
                styles={props.styles.filter(style => style.element === 'card')}
                onAddVariant={(name) => { addCardVariant(name) }}
                controls={(style) => <>
                        <div grid="cols-[1fr]" sizing="h-full">
                            <ElementCssEditor
                                selector={`.${style.variant}`}
                                content={style.css}
                                onChange={(value) => onCssChanged(value, style)} onBlur={() => save(style.id)}/>
                        </div>
                    </>}
                example={(style) => <>
                    <article class={style.variant} sizing={"min-w-20rem min-h-10rem"}>
                        <h2>Card Title</h2>
                        <p>Card content</p>
                    </article>
                </>}
            />
        </div>
        <div id={"listStyles"} spacing={"mx-8 my-6"}>
            <h3>Lists</h3>
            <ElementsTemplate
                styles={props.styles.filter(style => style.element === 'ul')}
                onAddVariant={(name) => { addListVariant(name) }}
                controls={(style) => <>
                        <div grid="cols-[1fr]" sizing="h-full">
                            <ElementCssEditor
                                selector={`.${style.variant}`}
                                content={style.css}
                                onChange={(value) => onCssChanged(value, style)} onBlur={() => save(style.id)}/>
                        </div>
                    </>}
                example={(style) => <>
                <div flex={"col gap-4"}>
                    <ul class={style.variant} sizing={"min-w-15rem"}>
                        <li>Item 1</li>
                        <li>Item 2</li>
                        <li>Item 3</li>
                    </ul>
                </div>
                </>}
            />
        </div>
    </div>
}
