import {useTypographyScope} from "~/app/typography/TypographyEditor/TypographyScope";
import {SubPageTemplate} from "~/components/SubPageTemplate";
import {useNavigate} from "@web/router";


export function TypographyEditor() {

    const {themeId, role, size, type} = useTypographyScope()

    const navigate = useNavigate()
    function onBackClicked() {
        navigate(`/editor/${themeId()}/typography`)
    }
    return <div>
        <SubPageTemplate onBackClicked={onBackClicked} title={`Edit Typeface`} backButtonText={"Back to Typography"} >
            <div class="grid grid-cols-[1fr_1fr] gap-8 mx-8">
                <article class="col-span-full">
                    <h3>Live Preview</h3>

                </article>
                <article>
                    <h3>Font Properties</h3>
                </article>
                <article>
                    <h3>Apply as Default</h3>
                </article>
            </div>
        </SubPageTemplate>
    </div>
}
