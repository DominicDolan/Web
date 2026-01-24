import ElementsTemplate from "~/app/elements/ElementsTemplate";
import ElementCssEditor from "~/app/elements/components/ElementCssEditor";


export function Inputs() {

    return <ElementsTemplate
        variants={["Outlined", "Filled"]}
        example={<div><input type="text"/></div>}
        controls={(value: string) => <>
            <div flex={"col gap-2"} spacing={"pa-2"}>
                <div>
                    <ElementCssEditor selector={`.${value.toLowerCase()}`}/>
                </div>
                <textarea/>
            </div>
        </>}
    />
}
