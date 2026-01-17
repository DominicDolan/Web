import Title from "~/app/common/Title";


export default function NavBarTemplate(props: { children?: any}) {

    return <nav class={"pageNav"} spacing={"py-4 px-6"} flex={"col gap-8"}>
        <Title/>
        {props.children}
    </nav>
}
