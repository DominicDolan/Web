import {EditorView, minimalSetup} from "codemirror";
import "./CodeEditor.module.css"
import {Extension} from "@codemirror/state";
import {autocompletion, closeBrackets} from "@codemirror/autocomplete";
import {onChangeExtension} from "~/app/common/CodeEditor/CodeEditorPlugins";

function toExtensionArray(ext?: Extension | readonly Extension[]): readonly Extension[] {
    if (ext == null) return [];
    return Array.isArray(ext) ? ext : [ext];
}

export default function CodeEditor(props: ConstructorParameters<typeof EditorView>[0] & { onChange?: (value: string) => void, onBlur?: () => void}) {

    let ref: HTMLElement | undefined

    function mountEditorView() {
        new EditorView({
            parent: ref,
            doc: props?.doc,
            ...props,
            extensions: [
                minimalSetup,
                autocompletion(),
                closeBrackets(),
                props.onChange ? onChangeExtension(props.onChange) : [],
                props.onBlur
                    ? EditorView.domEventHandlers({
                        blur: (_event, v) => {
                            props.onBlur?.();
                        }
                    })
                    : [],
                ...toExtensionArray(props?.extensions)
            ],
        })
    }

    return <code ref={(el) => {ref = el; setTimeout(() => mountEditorView())}}></code>
}
