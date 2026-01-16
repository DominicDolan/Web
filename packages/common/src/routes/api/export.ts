import type { APIEvent } from "@solidjs/start/server";
import * as fs from "node:fs"

export function GET(event: APIEvent) {
    console.log("GET", event)
}

export async function POST(event: APIEvent) {
    const formData = await event.request.formData()

    const location = formData.get("location")
    if (location == null) {
        return new Response()
    }

    await new Promise<void>((resolve, reject) => {
        fs.writeFile(location.toString(), "Hello SOlid Start", (e) => {
            if (e) {
                reject(e)
            } else {
                resolve()
            }
        })
    })

    return new Response()
}

export function PATCH() {
    // ...
}

export function DELETE() {
    // ...
}