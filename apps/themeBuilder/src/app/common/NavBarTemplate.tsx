import Title from "~/app/common/Title";


export default function NavBarTemplate(props: { children?: any, class?: string, prepend?: any }) {

    return <nav class={`pageNav ${props.class}`} spacing={"py-4 px-6"} flex={"col gap-8"}>
        <div flex={"row gap-2 center"}>
            {props.prepend }
            <Title/>
        </div>
        {props.children}
    </nav>
}
