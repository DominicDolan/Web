import {EditorView} from "codemirror";


export default function CodeEditor(props: ConstructorParameters<typeof EditorView>[0]) {

    let ref: HTMLElement | undefined

    function mountEditorView() {
        new EditorView({
            parent: ref,
            doc: props?.doc,
            extensions: props?.extensions,
            ...props,
        })
    }

    return <div ref={(el) => {ref = el; setTimeout(() => mountEditorView())}}></div>
}
