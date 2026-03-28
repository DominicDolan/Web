"use server";

export async function greet(name: string) {
    console.log(`Executing on the server for: ${name}`);
    // You could do database calls or secret API keys here
    return {
        message: `Hello ${name}, from the server!`,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
    };
}
