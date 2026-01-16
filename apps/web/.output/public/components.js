
// language=CSS

const nonShadowStyle = `
    @layer reset {
        :where(.input) {
            color: fieldtext;
            display: inline-block;
            text-align: start;
            -webkit-rtl-ordering: logical;
            background-color: field;
            margin: 0;
            border-width: 2px;
            border-style: inset;
            border-color: light-dark(rgb(118, 118, 118), rgb(133, 133, 133));
            border-image: initial;
            padding-block: 1px;
            padding-inline: 2px;

            &:focus-within {
                outline: -webkit-focus-ring-color auto 1px;
            }
        }
        
    }
`

// language=CSS
const inputResetStyle = `
input, select {
    border: none;
    padding: 0;
    background-color: transparent;

    &:focus-visible {
        outline: none;
    }
}
`

const customElements = []
class CustomInput extends HTMLElement {
    static formAssociated = true

    constructor() {
        super()
        this.internals_ = this.attachInternals()
        const id = `custom-${this.constructor.tag}`
        let template = document.getElementById(id);
        let templateContent = template.content;

        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(templateContent.cloneNode(true));

        this.input = shadowRoot.querySelector("input,select")

        this.classList.add("input")
    }

    static style = inputResetStyle

    connectedCallback() {}

    disconnectedCallback() {}

    connectedMoveCallback() {}

    adoptedCallback() {}

    attributeChangedCallback(name, oldValue, newValue) {}

    // Form controls usually expose a "value" property
    get value() { return this.input.value; }
    set value(v) {
        this.input.value = v;
    }

    // The following properties and methods aren't strictly required,
    // but browser-level form controls provide them. Providing them helps
    // ensure consistency with browser-provided controls.
    get form() { return this.internals_.form; }
    get name() { return this.getAttribute('name'); }
    get type() { return this.localName; }
    get validity() {return this.internals_.validity; }
    get validationMessage() {return this.internals_.validationMessage; }
    get willValidate() {return this.internals_.willValidate; }

    checkValidity() { return this.internals_.checkValidity(); }
    reportValidity() {return this.internals_.reportValidity(); }
}

class TextInput extends CustomInput {

    static tag = "text-input"
    static render() {
        return `
            <div class="input" style="display: flex; gap: 0.5rem">
                <slot name="prepend"></slot>
                <input type="text">
                <slot name="append"></slot>
            </div>
        `
    }
}
customElements.push(TextInput)

class DropDown extends CustomInput {
    static tag = "drop-down"

    static render() {
        return `
        <div class="input" style="display: flex; gap: 0.5rem">
            <slot name="prepend"></slot>
            <select>
                <slot></slot>
            </select>
            <slot name="append"></slot>
        </div>
        `
    }
}
customElements.push(DropDown)

function setupElements() {
    document.body.insertAdjacentHTML('beforeend',`<style>${nonShadowStyle}</style>`)
    for (const element of customElements) {

        const id = `custom-${element.tag}`
        document.body.insertAdjacentHTML(
            "beforeend",
            `<template id="${id}"><style>${element.style}</style>${element.render()}</template>`);

        window.customElements.define(element.tag, element)
    }
}

setupElements()

