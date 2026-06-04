import {useTypefaceScope} from "~/app/typography/TypefaceEditor/TypefaceScope";
import {SubPageTemplate} from "~/components/SubPageTemplate";
import {useNavigate} from "@web/router";
import {createMemo, createSignal, Loading, Match, Switch, type JSX, Accessor, For, Repeat, snapshot} from "solid-js";
import {Dynamic} from "@solidjs/web";
import {getTypefaceSelector} from "~/app/typography/TypographyUtils";
import {propertyFields, TextPropertyKey} from "~/app/typography/TypefaceEditor/TypefaceFormItems";
import {buildCssDeclarations, indentCss, parseCssDeclarations} from "~/app/typography/TypefaceEditor/TypefaceCssUtils";
import {ApplyAsDefaultSelector} from "~/app/typography/TypefaceEditor/ApplyAsDefaultSelector";

export function TypefaceEditor() {

    const {themeId, role, size, type, typeface, getCssOrDefault, updateCss, addSelector, updateSelector} = useTypefaceScope()

    const navigate = useNavigate()
    function onBackClicked() {
        navigate(`/editor/${themeId()}/typography`)
    }

    const [activeTab, setActiveTab] = createSignal<"properties" | "code">("properties")

    const cssProperties = createMemo(() => parseCssDeclarations(getCssOrDefault()))
    const selector = createMemo(() => getTypefaceSelector(role(), size(), type()))
    const codeBlock = createMemo(() => `${selector()} {\n${indentCss(getCssOrDefault())}\n}`)

    function updateProperty(property: TextPropertyKey, value: string) {
        const nextProperties = {...cssProperties()}

        if (value.trim()) {
            nextProperties[property] = value.trim()
        } else {
            delete nextProperties[property]
        }

        updateCss(buildCssDeclarations(nextProperties), true)
    }

    const applyAsDefaultSelectors = createMemo(() => typeface()?.applyAsDefault ?? [] as Array<string>)

    function onAddSelectorClicked() {
        const newSelectorIndex = applyAsDefaultSelectors().length
        addSelector()
        setCurrentlyEditingSelector(newSelectorIndex)
    }

    function onEditSelector(index: number, value: string) {
        updateSelector(value, index, true)
    }

    function onFinishedEditSelector(index: number, value: string) {
        setTimeout(() => {
            setCurrentlyEditingSelector(null)
        })
        updateSelector(value, index, false)
    }

    function onRemoveSelectorClicked(index: number) {
        console.log("removing")
    }

    const [currentlyEditingSelector, setCurrentlyEditingSelector] = createSignal<number | null>(null)

    return <div>
        <SubPageTemplate onBackClicked={onBackClicked} title={`Edit Typeface`} backButtonText={"Back to Typography"}>
            <Loading>
                <div class="grid grid-cols-[1fr_1fr] gap-8 mx-8">
                    <section class="row-span-2">
                        <hgroup class="flex flex-row justify-between items-center">
                            <h3 class="headline variant">Font Properties</h3>
                            <ul role="tablist" class="inset">
                               <li class={{ active: activeTab() === "properties" }} onClick={() => setActiveTab("properties")}>Properties</li>
                               <li class={{ active: activeTab() === "code" }} onClick={() => setActiveTab("code")}>Code</li>
                            </ul>
                        </hgroup>
                        <div>
                            <Switch>
                                <Match when={activeTab() === "properties"}>
                                    <form class="grid grid-cols-[1fr_1fr] gap-4 px-4 py-6">
                                        {propertyFields.map((field) => (<div>
                                                <Dynamic
                                                    component={field.component}
                                                    onInput={(value: string) => updateProperty(field.key, value)}
                                                    value={() => cssProperties()[field.key] ?? ""}/>
                                            </div>
                                        ))}
                                    </form>
                                </Match>
                                <Match when={activeTab() === "code"}>
                                    <pre class="inset px-4 py-6 whitespace-pre-wrap overflow-auto">{codeBlock()}</pre>
                                </Match>
                            </Switch>
                        </div>
                    </section>
                    <article>
                        <h3 class="headline variant">Live Preview</h3>
                        <article class="inset flex flex-col gap-4 p-4 m-4">
                            <div style={getCssOrDefault()}>The Quick Brown Fox Jumped Over the Lazy Dog</div>
                            <div style={getCssOrDefault()}>0123456789 !?&amp;@</div>
                        </article>
                    </article>
                    <article>
                        <h3 class="headline variant">Apply as Default</h3>
                        <div class="p-4 flex flex-col gap-4">
                            <Repeat count={applyAsDefaultSelectors().length}>{(index) => <>
                                <ApplyAsDefaultSelector
                                    selector={applyAsDefaultSelectors()[index]}
                                    isEditing={currentlyEditingSelector() === index}
                                    onClick={() => setCurrentlyEditingSelector(index)}
                                    onInput={(value) => onEditSelector(index, value)}
                                    onEnter={(value) => onFinishedEditSelector(index, value)}
                                    onDelete={() => onRemoveSelectorClicked(index)}
                                />
                            </>}
                            </Repeat>
                            <article class="tonal accent flex flex-row gap-2 items-center" role="button" onClick={() => onAddSelectorClicked()}>
                                <i>add_circle</i>
                                <span>Add Selector</span>
                            </article>

                        </div>
                    </article>
                </div>
            </Loading>
        </SubPageTemplate>
    </div>
}
