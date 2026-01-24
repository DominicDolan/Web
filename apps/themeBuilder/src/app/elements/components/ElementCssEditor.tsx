import CodeEditor from "~/app/common/CodeEditor/CodeEditor";
import {basicSetup} from "codemirror";
import {css} from "@codemirror/lang-css";
import {highlightReadOnlyLines, readOnlyLines} from "~/app/common/CodeEditor/CodeEditorPlugins";
import style from "./ElementCssEditor.module.css"

export default function ElementCssEditor(props: {selector: string}) {
    function getDoc() {
        return `${props.selector} {\n  \n}`
    }
    return <CodeEditor
        extensions={[
            basicSetup,
            css(),
            readOnlyLines([1, -1]),
            highlightReadOnlyLines([1, -1], style.disabled)
        ]}
        doc={getDoc()}
    />
}
