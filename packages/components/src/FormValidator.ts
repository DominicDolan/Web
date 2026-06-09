import {ZodSafeParseResult} from "zod";
import {createMemo, createSignal, createEffect, onSettled} from "solid-js";
import {debounce} from "@web/utils/Debounce.ts";
import {$ZodIssue} from "zod/v4/core";
import {createEvent} from "@web/utils/EventListener.ts";

export type FormValidatorOptions = {
    debounce?: number
    shouldQueueSubmit?: boolean
}

export type Validity = "unknown" | "valid" | "invalid"

export function useFormValidator<M>(
    validator: (formData: FormData) => Promise<ZodSafeParseResult<M>>,
    onSubmit: (e: SubmitEvent, model: M) => void,
    options: FormValidatorOptions = {}
) {
    const [formEl, setFormEl] = createSignal<HTMLFormElement | null>(null)
    const [formData, setFormData] = createSignal<FormData | null>(null)

    const setFormDataDebounced = debounce(() => {
        const form = formEl()
        if (form == null) return

        const formData = new FormData(form ?? undefined)

        setFormData(formData)
    }, options.debounce ?? 2000)

    const result = createMemo(() => {
        const fd = formData()
        if (fd == null) return null

        return validator(fd)
    })

    const issues = createMemo<$ZodIssue[]>(() => {
        const r = result()
        if (r == null || formData() == null) return []
        if (!r.success && r.error.message != null) {
            return JSON.parse(r.error.message)
        }
        return []
    })

    const validModel = () => {
        const r = result()
        if (r?.success) {
            return r.data
        }
        return null
    }

    const validity = createMemo<Validity>(() => {
        const r = result()
        if (r == null) {
            return "unknown"
        } else if (r.success) {
            return "valid"
        } else {
            return "invalid"
        }
    })

    createEffect(() => [issues(), formEl()] as const, (value) => {
        const [issues, form] = value
        if (form == null) return

        for (let input of form.elements) {
            if (input instanceof HTMLInputElement) {
                input.setCustomValidity("")
            }
        }
        for (const issue of issues) {
            const path = issue.path[0] as string

            const input = form.elements[path as any] as HTMLInputElement
            if (input == null) continue

            input.setCustomValidity(issue.message)
        }
    })

    createEffect(validity, (newValidity, oldValidity) => {
        if (newValidity === "valid" && oldValidity === "unknown" && lastSubmitAttempt != null) {
            const submit = lastSubmitAttempt
            lastSubmitAttempt = null

            setTimeout(() => {
                submit()
            })
        }
    })

    let lastSubmitAttempt: (() => void) | null = null

    onSettled(() => {
        const form = formEl()

        function onInput() {
            setFormDataDebounced()
        }

        function onFormBlur() {
            lastSubmitAttempt = null
            setFormDataDebounced.flush()
        }

        function onFormFocus() {
            lastSubmitAttempt = null
            setFormDataDebounced.flush()
        }

        function onFormSubmit(e: SubmitEvent) {
            e.preventDefault()
            const submitFn = () => {
                const model = validModel()
                if (model == null) return
                onSubmit(e, model)
            }
            if (validity() === "unknown" && (options.shouldQueueSubmit ?? true)) {
                lastSubmitAttempt = submitFn
            }
            if (validity() === "valid") {
                submitFn()
            }
        }

        if (form != null) {
            form.addEventListener("submit", onFormSubmit)

            const fd = new FormData(form)

            for (const key of fd.keys()) {
                const inputElement = form.elements[key as any] as HTMLElement
                inputElement.addEventListener("input", onInput)

                inputElement.addEventListener("blur", onFormBlur)

                inputElement.addEventListener("focus", onFormFocus)
            }
        }

        return () => {
            const form = formEl()
            setFormEl(null)

            if (form == null) return

            form.removeEventListener("submit", onFormSubmit)

            const fd = new FormData(form)
            for (const key of fd.keys()) {
                const inputElement = form.elements[key as any] as HTMLElement
                inputElement.removeEventListener("input", onInput)
                inputElement.removeEventListener("blur", onFormBlur)
                inputElement.removeEventListener("focus", onFormFocus)
            }

        }
    })

    function setFormRef(el: HTMLFormElement) {
        setFormEl(el)
    }

    function issuesByName(name: string) {
        return issues().filter(i => i.path.at(-1) === name)
    }

    function issueMessageByName(name: string) {
        return issuesByName(name)?.map(i => i.message) ?? ""
    }

    return {
        setFormRef,
        formData,
        issues,
        issuesByName,
        issueMessageByName,
        validModel,
        validity
    }
}

