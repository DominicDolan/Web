

export function SubPageTemplate(props: { onBackClicked: () => void, backButtonText?: string, title: string, children?: any }) {
    return <div class="grid grid-rows-[min-content_1fr] gap-y-8 h-full">
        <nav class="top flex flex-row items-center gap-4 col-span-full p-4">
            <button class="text flex items-center gap-2" onClick={props.onBackClicked}><i>arrow_back</i> {props.backButtonText ?? 'Go Back'}</button>
            <hr class="w-px h-full" />
            <h1>{props.title}</h1>
        </nav>
        { props.children}
    </div>
}
