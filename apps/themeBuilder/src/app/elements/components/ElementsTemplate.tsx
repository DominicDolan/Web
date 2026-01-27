import {useTabs} from "@web/components";


export default function ElementsTemplate(props: {example: any, controls: (value: string) => any, variants: string[]}) {

    const {tabProps, windowProps, value} = useTabs()

    return <div sizing={"h-full"}>
        <div>
            <ul flex={"row"} class={"tabs"}>
                {props.variants.map((variant, index) => <li {...tabProps(index)}>{variant}</li>)}
            </ul>
            <window-group {...windowProps}>
                {props.controls(props.variants[value()])}
            </window-group>
        </div>
        <div>
            <article class={"elementsPreview inset"}>
                <article class={"elevated"} spacing={"mx-auto"} sizing={"w-fit"}>
                    {props.example}
                </article>
            </article>
        </div>
    </div>
}
