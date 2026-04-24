import {useTypefaceScope} from "~/app/typography/TypefaceEditor/TypefaceScope";
import {SubPageTemplate} from "~/components/SubPageTemplate";
import {useNavigate} from "@web/router";
import {Loading} from "solid-js";


export function TypefaceEditor() {

    const {themeId, role, size, type, getCssOrDefault} = useTypefaceScope()

    const navigate = useNavigate()
    function onBackClicked() {
        navigate(`/editor/${themeId()}/typography`)
    }
    return <div>
        <SubPageTemplate onBackClicked={onBackClicked} title={`Edit Typeface`} backButtonText={"Back to Typography"} >
            <Loading>
                <div class="grid grid-cols-[1fr_1fr] gap-8 mx-8">
                    <article class="col-span-full">
                        <h3 class="headline variant">Live Preview</h3>
                        <div style={getCssOrDefault()}>The Quick Brown Fox Jumped Over the Lazy Dog</div>
                    </article>
                    <article>
                        <h3 class="headline variant">Font Properties</h3>
                    </article>
                    <article>
                        <h3 class="headline variant">Apply as Default</h3>
                    </article>
                </div>
            </Loading>
        </SubPageTemplate>
    </div>
}
