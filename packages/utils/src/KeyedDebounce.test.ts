import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {keyedDebounce} from "./KeyedDebounce"

describe("keyedDebounce", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("debounces independently by first argument key", () => {
        const fn = vi.fn()
        const debounced = keyedDebounce(fn, 100)

        debounced("a", 1)
        debounced("b", 2)

        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)

        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenNthCalledWith(1, "a", 1)
        expect(fn).toHaveBeenNthCalledWith(2, "b", 2)
    })

    it("flush invokes pending calls once and clears queued timers", () => {
        const fn = vi.fn()
        const debounced = keyedDebounce(fn, 100)

        debounced("a", "first")
        debounced("b", "second")

        expect(vi.getTimerCount()).toBe(2)

        debounced.flush()

        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenNthCalledWith(1, "a", "first")
        expect(fn).toHaveBeenNthCalledWith(2, "b", "second")
        expect(vi.getTimerCount()).toBe(0)

        vi.advanceTimersByTime(500)
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it("after flush, a new call does not get invoked twice", () => {
        const fn = vi.fn()
        const debounced = keyedDebounce(fn, 100)

        debounced("a", "first")
        vi.advanceTimersByTime(50)
        debounced.flush()

        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenLastCalledWith("a", "first")
        expect(vi.getTimerCount()).toBe(0)

        debounced("a", "second")
        vi.advanceTimersByTime(100)

        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenLastCalledWith("a", "second")

        vi.advanceTimersByTime(500)
        expect(fn).toHaveBeenCalledTimes(2)
    })
})
