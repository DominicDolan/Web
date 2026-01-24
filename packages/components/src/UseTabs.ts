import {createSignal, onMount} from "solid-js";
import "./UseTabs.css"

export function useTabs() {
    const [activeValue, setActiveTab] = createSignal(0)

    let windowElement: HTMLElement | undefined
    const windowProps = {
        ref: (el: any) => {
            return windowElement = el;
        }
    }

    onMount(() => {
        if (windowElement != null) {
            windowElement.style.viewTransitionName = "window-" + window.performance.now().toString().replace('.', '_') + Math.floor(Math.random() * 1000);
        }
    })

    return {
        matches(value: number) {
            return activeValue() === value
        },
        tabProps(value: number) {
            return {
                class: activeValue() === value ? "active" : "",
                onClick(){
                    if (activeValue() === value) return

                    const oldValue = activeValue()

                    const targetTransition = value > oldValue ? "slide-right" : "slide-left"

                    const oldName = windowElement?.style.viewTransitionName
                    if (windowElement != null) {
                        windowElement.style.viewTransitionName = targetTransition
                    }
                    if (document.startViewTransition != null) {
                        document.startViewTransition(() => {
                            setActiveTab(value)
                        }).finished.then(() => {
                            if (windowElement != null) {
                                windowElement.style.viewTransitionName = oldName ?? "none"
                            }
                        })
                    } else {
                        setActiveTab(value)
                    }
                }
            }
        },
        value: activeValue,
        windowProps
    }
}
