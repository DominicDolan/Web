import CodeEditor from "~/app/common/CodeEditor/CodeEditor";
import {css} from "@codemirror/lang-css";
import {highlightReadOnlyLines, readOnlyLines} from "~/app/common/CodeEditor/CodeEditorPlugins";
import style from "./ElementCssEditor.module.css"

export default function ElementCssEditor(props: {selector: string, content: string, onChange?: (value: string) => void, onBlur?: () => void}) {
    function getDoc() {
        return `${props.selector} {\n${props.content}\n}`
    }
    return <CodeEditor
        extensions={[
            css(),
            readOnlyLines([1, -1]),
            highlightReadOnlyLines([1, -1], style.disabled)
        ]}
        doc={getDoc()}
        onChange={props.onChange}
        onBlur={props.onBlur}
    />
}
