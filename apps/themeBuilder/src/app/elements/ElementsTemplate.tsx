import {useTabs} from "@web/components";


export default function ElementsTemplate(props: {example: any, controls: (value: string) => any, variants: string[]}) {

    const {tabProps, windowProps, value} = useTabs()

    return <div grid-rows={"[1fr,20rem]"}>
        <div>
            <article spacing={"ma-5rem"}>
                {props.example}
            </article>
        </div>
        <div class={"surface"} spacing={"pa-2rem"}>
            <ul flex={"row"} class={"tabs"}>
                {props.variants.map((variant, index) => <li {...tabProps(index)}>{variant}</li>)}
            </ul>
            <window-group {...windowProps}>
                {props.controls(props.variants[value()])}
            </window-group>
        </div>
    </div>
}
