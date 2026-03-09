import {Rule} from "@unocss/core";


export const positionRules: Rule[] = [
    ["position-static", { position: "static" }],
    ["position-relative", { position: "relative" }],
    ["position-absolute", { position: "absolute" }],
    ["position-fixed", { position: "fixed" }],
    ["position-sticky", { position: "sticky" }],
    [/^position-area-\[(.+)]$/, ([, c]) => ({
        ["position-area"]: c.split(",").map(i => i).join(" "),
    })],
]
