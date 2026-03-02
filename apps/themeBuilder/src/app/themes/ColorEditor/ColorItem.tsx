import {useSubmissions} from "@solidjs/router"
import {createMemo} from "solid-js"
import {updateColors, useColorScope} from "~/app/themes/ColorEditor/ColorEditor";
import {$ZodIssue} from "zod/v4/core";
import {ColorDefinition} from "~/models/ColorDefinition";

export default function ColorItem(props: { definition: ColorDefinition }) {

    const { pushColorDelta } = useColorScope()
    const submissions = useSubmissions(updateColors, ([input]) => {
        return input.modelId === props.definition.id
    })

    const issues = createMemo(() => {
        const submission = submissions[0]
        if (submission == null || submission.result == null) {
            return []
        }
        const {success, error} = submission.result
        if (success) {
            return []
        }
        return (error as any).issues as $ZodIssue[] ?? []
    })

    function getIssueByPath(path: string) {
        return issues().find(issue => issue.path[0] === path)
    }

    function onColorChanged(e: InputEvent) {
        submissions[0]?.clear()
        pushColorDelta(props.definition.id, {
            hex: (e.target as HTMLInputElement).value
        })
    }

    function onAlphaChanged(e: Event) {
        submissions[0]?.clear()
        pushColorDelta(props.definition.id, {
            alpha: parseFloat((e.target as HTMLInputElement).value)
        })

    }

    function onNameChanged(e: Event) {
        submissions[0]?.clear()
        pushColorDelta(props.definition.id, {
            name: (e.target as HTMLInputElement).value
        })
    }

    return <div flex={"row gap-8"} spacing={"ma-4"}>
        <div flex={"col gap-4"}>
            <div flex={"row gap-4"}>
                <input value={props.definition.hex} onInput={onColorChanged} class={"filled"} type={"color"} sizing={"h-10 w-16"}/>
                <p>{props.definition.hex} / {props.definition.alpha}</p>
            </div>
            <span sizing={"h-1ch"}>{getIssueByPath("hex")?.message}</span>
            <input value={props.definition.alpha} onInput={onAlphaChanged} class={"filled"} min={0} max={1} step={0.01} type={"range"}/>
            <span>{getIssueByPath("alpha")?.message}</span>
        </div>
        <div class={"formField filled"} flex={"col gap-2"}>
            <label>Variable Name</label>
            <input value={props.definition.name} onInput={onNameChanged}/>
            <span sizing={"h-1ch"}>{getIssueByPath("name")?.message}</span>
        </div>
    </div>
}
