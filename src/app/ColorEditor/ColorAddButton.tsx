import {useColorContext} from "~/app/ColorEditor/ColorEditor";

export function ColorAddButton() {

    const [pushColorDelta] = useColorContext()

    function addColor() {
        pushColorDelta("create", {
            hex: "#000000",
            alpha: 1.0,
            name: "",
        })
    }

    return <button onClick={addColor} flex={"row gap-2 center"}><i>add</i> Add Color</button>
}
