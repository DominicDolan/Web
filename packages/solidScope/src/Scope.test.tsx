import {createRoot, createSignal} from "solid-js";
import { render } from '@solidjs/web';
import {describe, expect, it} from "vitest";

import {createScopeProvider, defineScope} from "./Scope";

describe("createScopeProvider", () => {
    it("provides scoped values and memoizes setup per provider instance", () => {
        const ScopeProvider = createScopeProvider<{ count: number }>();

        let setupCalls = 0;
        const useCounterScope = defineScope(ScopeProvider, (props) => {
            setupCalls += 1;
            return {
                doubled: () => props.count * 2,
            };
        });

        let childValue: number | undefined;

        const host = document.createElement("div");
        const dispose = render(() => (<ScopeProvider
                count={4}
                use={useCounterScope}>
                {(scope) => {
                    const sameScope = useCounterScope();
                    expect(sameScope).toBe(scope);
                    childValue = scope.doubled();
                    return <></>;
                }}</ScopeProvider>), host,);

        expect(childValue).toBe(8);
        expect(setupCalls).toBe(1);

        dispose();
    });

    it("throws when a scope is used outside its provider", () => {
        const ScopeProvider = createScopeProvider<{ count: number }>();
        const useCounterScope = defineScope(ScopeProvider, (props) => ({
            doubled: () => props.count * 2,
        }));

        expect(() => {
            createRoot(() => {
                useCounterScope();
            });
        }).toThrow(/Unable to retrieve props for context store/);
    });

    it("updates scoped reactive values when provider props change", async () => {
        const ScopeProvider = createScopeProvider<{ count: number }>();
        const useCounterScope = defineScope(ScopeProvider, (props) => ({
            doubled: () => props.count * 2,
        }));

        const [count, setCount] = createSignal(1);

        function ChildComponent() {
            const {doubled} = useCounterScope();
            return <div>Double Count: {doubled()}</div>;
        }

        const host = document.createElement("div");
        const dispose = render(() => (<ScopeProvider
                count={count()}>
                <ChildComponent/>
            </ScopeProvider>), host,);

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(host.outerHTML).toContain("Double Count: 2");

        setCount(5);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(host.outerHTML).toContain("Double Count: 10");

        dispose();
    });
});
