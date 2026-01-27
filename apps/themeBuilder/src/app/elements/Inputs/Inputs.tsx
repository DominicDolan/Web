import ElementsTemplate from "~/app/elements/components/ElementsTemplate";
import ElementCssEditor from "~/app/elements/components/ElementCssEditor";
import {createMemo, createSignal} from "solid-js";


export function Inputs() {

    const [tab, setTab] = createSignal(null as string | null)

    const [css, setCss] = createSignal("")

    const cssContents = createMemo(() => {

    })
    function onChange(value: string) {
        console.log(value)
    }
    return <div class={"surface"} flex={"col gap-8"}>
        <div spacing={"mx-8"}>
            <h3>Text Inputs</h3>
            <ElementsTemplate
                variants={["Filled"]}
                controls={(variant) => <>
                        <div grid="cols-[1fr]" spacing="my-4">
                            <ElementCssEditor selector={`.${variant.toLowerCase()}`} onChange={onChange}/>
                        </div>
                    </>}
                example={
                <div flex={"col gap-4"}>
                    <div>
                        <div grid={"cols-[1fr,1fr]"}>
                            <input class={"filled"}/>
                            <input class={"filled"}/>
                        </div>
                    </div>
                    <div>
                        <div grid={"cols-[1fr,1fr]"}>
                            <form-field flex={"col gap-2"}>
                                <label>Label</label>
                                <input class={"filled"}/>
                                <feedback-message>Validation message</feedback-message>
                            </form-field>
                        </div>
                    </div>
                </div>}
            />
        </div>
    </div>
}
