
export const elementCategories = [
    {
        name: "Inputs",
        type: "input",
        icon: "text_select_start",
        description: "Text fields, checkboxes, and selects",
        preview: "input",
        selector: "input:not([type=radio]):not([type=checkbox]):not([type=range]), textarea, select, input-shell"
    },
    {
        name: "Cards",
        type: "card",
        icon: "newsmode",
        description: "Containers and content surfaces",
        preview: "card",
        selector: "article"
    },
    {
        name: "Buttons",
        type: "button",
        icon: "left_click",
        description: "Primary, secondary, and ghost actions",
        preview: "button",
        selector: "button, input[type=button], input[type=submit], input[type=reset], input[type=image]"
    },
    {
        name: "Lists",
        type: "list",
        icon: "list",
        description: "Data grids and navigation lists",
        preview: "list",
        selector: "ul, ol",
        innerSelector: "& > li"
    },
    {
        name: "Tabs",
        type: "tab",
        icon: "tab_group",
        description: "Content switching and navigation",
        preview: "tab",
        selector: "ul[role=tablist], ol[role=tablist], nav[role=tablist]"
    }
]

export type ElementCategory = typeof elementCategories[number]
