import CssEditor from "~/components/CodeEditor/CssEditor.tsx";
import {ElementVariantDefinition} from "~/models/ElementVariantDefinition.ts";
import {useElementEditorScope} from "~/app/elements/ElementEditor/ElementEditorScope.ts";


export function ElementVariantEditor(props: { variant: ElementVariantDefinition, preview: any }){

    const {elementCategory} = useElementEditorScope()

    return <div class={"grid grid-cols-[1fr_1fr] mx-6 gap-8"}>
        <div class={"flex flex-col gap-8"}>
            <section class={"outlined flex flex-col grow justify-between"}>
                <h3 class="headline variant">Live Preview</h3>
                <div class="flex flex-col items-center justify-center w-full h-full">
                    <div>
                        {props.preview}
                    </div>
                </div>
            </section>
        </div>
        <article class="elevated flex flex-col gap-6">
            <article class="inset p-0">
                <CssEditor selector={elementCategory().selector} content={""}></CssEditor>
            </article>
            <article class="outlined min-w-100 grow">
                <h3 class="headline variant">Apply as default</h3>
            </article>
        </article>
    </div>
}
