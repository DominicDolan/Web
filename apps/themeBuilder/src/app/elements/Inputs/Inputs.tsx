import ElementsTemplate from "~/app/elements/components/ElementsTemplate";
import ElementCssEditor from "~/app/elements/components/ElementCssEditor";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {useElementStyleStore} from "~/app/elements/repository/ElementStyleStore";
import {debounce} from "@web/utils";


export function Inputs(props: { styles: ElementStyleDefinition[] }) {
    const { updateCss, save } = useElementStyleStore()

    const debouncedUpdateCss = debounce(updateCss, 1000)
    const debouncedSave = debounce(save, 4000)

    function onCssChanged(value: string, style: ElementStyleDefinition) {
        const lines = value.split('\n');
        const trimmedValue = lines.slice(1, -1).join('\n');

        debouncedUpdateCss(style.id, trimmedValue)
        debouncedSave(style.id)
    }

    return <div class={"surface"} flex={"col gap-8"}>
        <div spacing={"mx-8"}>
            <h3>Text Inputs</h3>
            <ElementsTemplate
                styles={props.styles}
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
                        <div grid={"cols-[1fr,1fr]"}>
                            <input class={style.variant}/>
                            <input class={style.variant}/>
                        </div>
                    </div>
                    <div>
                        <div grid={"cols-[1fr,1fr]"}>
                            <form-field flex={"col gap-2"}>
                                <label>Label</label>
                                <input class={style.variant}/>
                                <feedback-message>Validation message</feedback-message>
                            </form-field>
                        </div>
                    </div>
                </div>
                </>}
            />
        </div>
    </div>
}
