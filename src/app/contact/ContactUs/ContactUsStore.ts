
export function useContactUsStore() {

    async function add(id: string, formData: FormData) {
        const contents = `${id}:${new URLSearchParams(formData as unknown as URLSearchParams).toString()}`
        await new Promise<void>((resolve, reject) => {
            return Promise.resolve()
        })

    }

    return {
        add
    }
}
