import {useColorContext} from "~/app/ThemeEditor/ColorSettings";

export function ColorAddButton() {

    const [pushColorDelta] = useColorContext()

    function addColor() {
        pushColorDelta("create", {
            hex: "#000000",
            alpha: 1.0,
            name: "",
        })
    }

    return <button onClick={addColor}>Add Color</button>
}
