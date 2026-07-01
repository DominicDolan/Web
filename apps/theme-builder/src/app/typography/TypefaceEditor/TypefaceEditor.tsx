import {useTypefaceScope} from "~/app/typography/TypefaceEditor/TypefaceScope";
import {SubPageTemplate} from "~/components/SubPageTemplate";
import {useNavigate} from "@web/router";
import {createMemo, createSignal, Loading, Match, Switch, Repeat} from "solid-js";
import {Dynamic} from "@solidjs/web";
import {getTypefaceSelector} from "~/app/typography/TypographyUtils";
import {propertyFields, TextPropertyKey} from "~/app/typography/TypefaceEditor/TypefaceFormItems";
import {buildCssDeclarations, indentCss, parseCssDeclarations} from "~/app/typography/TypefaceEditor/TypefaceCssUtils";
import {ApplyAsDefaultSelector} from "~/app/typography/TypefaceEditor/ApplyAsDefaultSelector";
import CssEditor from "~/components/CodeEditor/CssEditor.tsx";

export function TypefaceEditor() {

    const {
        themeId,
        role,
        type,
        typeface,
        getCssOrDefault,
        getSmallCssOrDefault,
        getMediumCssOrDefault,
        getLargeCssOrDefault,
        updateFontCss,
        addSelector,
        updateSelector,
        removeSelector
    } = useTypefaceScope()

    const navigate = useNavigate()
    function onBackClicked() {
        navigate(`/editor/${themeId()}/typography`)
    }

    const [activeTab, setActiveTab] = createSignal<"properties" | "code">("properties")

    const cssProperties = createMemo(() => parseCssDeclarations(getCssOrDefault()))
    const selector = createMemo(() => getTypefaceSelector(role(), type()))

    function updateProperty(property: TextPropertyKey, value: string) {
        const nextProperties = {...cssProperties()}

        if (value.trim()) {
            nextProperties[property] = value.trim()
        } else {
            delete nextProperties[property]
        }

        updateFontCss(buildCssDeclarations(nextProperties), true)
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
        setTimeout(() => {
            setCurrentlyEditingSelector(null)
        })
        removeSelector(index)
    }

    const [currentlyEditingSelector, setCurrentlyEditingSelector] = createSignal<number | null>(null)

    return <SubPageTemplate onBackClicked={onBackClicked} title={`Edit Typeface`} backButtonText={"Back to Typography"}>
        <Loading>
            <div class="grid grid-cols-[1fr_1fr] gap-8 mx-8 pb-4 min-h-0">
                <section class={"overflow-y-auto"}>
                    <h3 class="headline variant">Live Preview</h3>
                    <div class="flex flex-col gap-12 my-6">
                        <div style={getLargeCssOrDefault()}>
                            <p style={getCssOrDefault()}>The Quick Brown Fox Jumped Over the Lazy Dog</p>
                            <p style={getCssOrDefault()}>0123456789 !?&amp;@</p>
                        </div>
                        <div style={getMediumCssOrDefault()}>
                            <p style={getCssOrDefault()}>The Quick Brown Fox Jumped Over the Lazy Dog</p>
                            <p style={getCssOrDefault()}>0123456789 !?&amp;@</p>
                        </div>
                        <div style={getSmallCssOrDefault()}>
                            <p style={getCssOrDefault()}>The Quick Brown Fox Jumped Over the Lazy Dog</p>
                            <p style={getCssOrDefault()}>0123456789 !?&amp;@</p>
                        </div>
                    </div>
                </section>
                <article class="flex flex-col gap-6 h-full min-h-0 overflow-y-auto">
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
                                <form class="grid grid-cols-[1fr_1fr] gap-4 px-4">
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
                                <div class="flex flex-col gap-6">
                                    <article class="inset flex flex-col gap-4 p-0">
                                        <CssEditor selector={selector()} content={indentCss(getCssOrDefault())} />
                                    </article>
                                    <article class="inset flex flex-col gap-4 p-0">
                                        <CssEditor selector={".large"} content={indentCss(getLargeCssOrDefault())} />
                                    </article>
                                    <article class="inset flex flex-col gap-4 p-0">
                                        <CssEditor selector={".medium"} content={indentCss(getMediumCssOrDefault())} />
                                    </article>
                                    <article class="inset flex flex-col gap-4 p-0">
                                        <CssEditor selector={".small"} content={indentCss(getSmallCssOrDefault())} />
                                    </article>
                                </div>
                            </Match>
                        </Switch>
                    </div>
                    <article class="outlined mt-6">
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
                </article>
            </div>
        </Loading>
    </SubPageTemplate>
}
