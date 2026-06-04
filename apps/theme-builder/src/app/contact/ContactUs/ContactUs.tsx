import {useContactUsStore} from "~/app/contact/ContactUs/ContactUsStore"
import {createId} from "@paralleldrive/cuid2"

const saveContactUsForm = async (id: string, formData: FormData) => {
    "use server"

    const store = useContactUsStore()

    await store.add(id, formData)
}
export default function ContactUs() {

    function onSubmitClicked(e: SubmitEvent) {
        e.preventDefault()

        const formFields = (e.target as HTMLElement).querySelectorAll("input, textarea") as NodeListOf<HTMLInputElement | HTMLTextAreaElement>
        formFields.forEach(item => {
            console.log("validity", item.validity.valid)
        })
        console.log(e)
    }

    const id = createId()

    return <div>
        <h2>Contact Us</h2>
        <form action={() => saveContactUsForm(id)} method={"post"} class={`filled`} spacing={"pa-4"}>
            <form-field flex={"col gap-2"}>
                <label>First Name</label>
                <input-shell>
                    <input type={"text"} name={"fname"} required/>
                </input-shell>
            </form-field>
            <form-field flex={"col gap-2"}>
                <label for="lname">Last Name</label>
                <input type={"text"} name={"lname"} id={"lname"} required/>
            </form-field>
            <form-field flex={"col gap-2"} grid={"col-span-full"}>
                <label for="email">Email</label>
                <input type={"email"} name={"email"} id={"email"} required/>
            </form-field>
            <article grid-col={"span-full"}>
                <fieldset class={"formField"}>
                    <div flex={"col gap-2"}>
                        <legend>Query Type</legend>

                        <div flex={"row gap-4 space-around"}>
                            <div flex={"grow row gap-4"}>
                                <input type={"radio"} name={"query"} id={"general"} value={"General Query"} required/>
                                <label for={"general"}>General Query</label>
                            </div>
                            <div flex={"grow row gap-4"}>
                                <input type={"radio"} name={"query"} id={"support"} value={"Support Request"} required/>
                                <label for={"support"}>Support Request</label>
                            </div>
                        </div>

                    </div>
                </fieldset>
            </article>
            <form-field flex={"col gap-2"} grid-col={"span-full"}>
                <label for="message">Message</label>
                <input-shell flex={"row"}><textarea flex-grow={"1"} name={"message"} id={"message"}></textarea></input-shell>
            </form-field>
            <form-field flex={"row gap-2"} grid-col={"span-full"}>
                <input id="consent" type={"checkbox"} required/>
                <label for="consent">Do you consent to us sending you emails</label>
            </form-field>
            <button grid-col={"span-full"}>Submit</button>
        </form>
    </div>
}
