import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { describe, expect, it, vi } from "vitest";

import { Model, ModelDelta } from "@web/schema";
import { createScopeProvider } from "@web/solid-scope";

import { defineDeltaScope } from "./DeltaScope";
import { ModelRecord } from "../machine/DeltaMachine";

interface CounterModel extends Model {
  count: number;
}

function toRecord<M extends Model>(deltas: ModelDelta<M>[]): ModelRecord<M> {
  return deltas.reduce((acc, delta) => {
    if (acc[delta.modelId] == null) {
      acc[delta.modelId] = [];
    }
    acc[delta.modelId].push(delta);
    return acc;
  }, {} as ModelRecord<M>);
}

describe("defineDeltaScope", () => {
  it("hydrates models from deltas and exposes machine updates", () => {
    const ScopeProvider = createScopeProvider<{
      deltas: ModelRecord<CounterModel>;
      multiplier: number;
    }>();

    const modelId = "counter-1";
    const deltas = toRecord<CounterModel>([
      {
        modelId,
        type: "create",
        timestamp: 1,
        payload: { count: 2 },
      },
    ]);

    let setupCalls = 0;
    const useCounterDeltaScope = defineDeltaScope(ScopeProvider, ({ models, push, props, store }) => {
      setupCalls += 1;
      return {
        models,
        push,
        getById: store.getModelById,
        scaledFirst: () => (models[0]?.count ?? 0) * props.multiplier,
      };
    });

    let scopeValue: ReturnType<typeof useCounterDeltaScope> | undefined;

    const host = document.createElement("div");
    const dispose = render(
        () => (
            <ScopeProvider
                deltas={deltas}
                multiplier={3}
                use={useCounterDeltaScope}
            >
              {(scope) => {
                scopeValue = scope;
                return null;
              }}
            </ScopeProvider>
        ),
        host,
    );

    expect(scopeValue?.models.length).toBe(1);
    expect(scopeValue?.models[0]?.id).toBe(modelId);
    expect(scopeValue?.scaledFirst()).toBe(6);

    scopeValue?.push(modelId, { count: 5 });

    expect(scopeValue?.getById(modelId)?.count).toBe(5);
    expect(scopeValue?.scaledFirst()).toBe(15);
    expect(setupCalls).toBe(1);

    dispose();
  });

  it("throws when deltas prop is null or undefined", () => {
    const ScopeProvider = createScopeProvider<{ deltas: ModelRecord<CounterModel> | undefined }>();
    const useCounterDeltaScope = defineDeltaScope(ScopeProvider, ({ models }) => ({
      models,
    }));

    const host = document.createElement("div");

    expect(() => {
      const dispose = render(
          () => (
              <ScopeProvider
                  deltas={undefined}
                  use={useCounterDeltaScope}
              >
              </ScopeProvider>
          ),
          host,
      );
      dispose();
    }).toThrow(/DeltaScope requires a deltas prop/);
  });

  it("updates derived values when non-delta provider props change", () => {
    const ScopeProvider = createScopeProvider<{
      deltas: ModelRecord<CounterModel>;
      multiplier: number;
    }>();

    const modelId = "counter-2";
    const deltas = toRecord<CounterModel>([
      {
        modelId,
        type: "create",
        timestamp: 1,
        payload: { count: 2 },
      },
    ]);

    const useCounterDeltaScope = defineDeltaScope(ScopeProvider, ({ models, props }) => ({
      scaledFirst: () => (models[0].count) * props.multiplier,
    }));

    const [multiplier, setMultiplier] = createSignal(2);
    let readScaled: (() => number) | undefined;

    const host = document.createElement("div");
    const dispose = render(
        () => (
            <ScopeProvider
                deltas={deltas}
                multiplier={multiplier()}
                use={useCounterDeltaScope}
            >
              {(scope) => {
                readScaled = scope.scaledFirst;
                return null;
              }}
            </ScopeProvider>
        ),
        host,
    );

    expect(readScaled?.()).toBe(4);

    setMultiplier(5);

    expect(readScaled?.()).toBe(10);

    dispose();
  });

  it("keeps prior models unless a delete delta arrives when props deltas change", () => {
    const ScopeProvider = createScopeProvider<{ deltas: ModelRecord<CounterModel> }>();

    const deltasA = toRecord<CounterModel>([
      {
        modelId: "counter-a",
        type: "create",
        timestamp: 1,
        payload: { count: 1 },
      },
    ]);

    const deltasB = toRecord<CounterModel>([
      {
        modelId: "counter-a",
        type: "create",
        timestamp: 1,
        payload: { count: 1 },
      },
      {
        modelId: "counter-b",
        type: "create",
        timestamp: 2,
        payload: { count: 99 },
      },
    ]);

    const deltasC = toRecord<CounterModel>([
      {
        modelId: "counter-a",
        type: "create",
        timestamp: 1,
        payload: { count: 1 },
      },
      {
        modelId: "counter-b",
        type: "create",
        timestamp: 2,
        payload: { count: 99 },
      },
      {
        modelId: "counter-a",
        type: "delete",
        timestamp: 3,
        payload: {},
      },
    ]);

    const useCounterDeltaScope = defineDeltaScope(ScopeProvider, ({ models }) => ({
      models,
    }));

    const [deltas, setDeltas] = createSignal<ModelRecord<CounterModel>>(deltasA);
    let readIds: (() => string[]) | undefined;

    const host = document.createElement("div");
    const dispose = render(
        () => (
            <ScopeProvider
                deltas={deltas()}
                use={useCounterDeltaScope}
            >
              {(scope) => {
                readIds = () => scope.models.map((m) => m.id);
                return null;
              }}
            </ScopeProvider>
        ),
        host,
    );

    expect(readIds?.()).toEqual(["counter-a"]);

    setDeltas(deltasB);

    expect(readIds?.()).toEqual(["counter-a", "counter-b"]);

    setDeltas(deltasC);

    expect(readIds?.()).toEqual(["counter-b"]);

    dispose();
  });

  it("applies incoming prop deltas by timestamp order", () => {
    const ScopeProvider = createScopeProvider<{ deltas: ModelRecord<CounterModel> }>();

    const initial = toRecord<CounterModel>([
      {
        modelId: "counter-ts",
        type: "create",
        timestamp: 1,
        payload: { count: 0 },
      },
    ]);

    const withOutOfOrderUpdates = toRecord<CounterModel>([
      {
        modelId: "counter-ts",
        type: "create",
        timestamp: 1,
        payload: { count: 0 },
      },
      {
        modelId: "counter-ts",
        type: "update",
        timestamp: 30,
        payload: { count: 30 },
      },
      {
        modelId: "counter-ts",
        type: "update",
        timestamp: 10,
        payload: { count: 10 },
      },
      {
        modelId: "counter-ts",
        type: "update",
        timestamp: 20,
        payload: { count: 20 },
      },
    ]);

    const useCounterDeltaScope = defineDeltaScope(ScopeProvider, ({ models }) => ({
      currentCount: () => models[0]?.count,
    }));

    const [deltas, setDeltas] = createSignal<ModelRecord<CounterModel>>(initial);
    let readCurrentCount: (() => number | undefined) | undefined;

    const host = document.createElement("div");
    const dispose = render(
        () => (
            <ScopeProvider
                deltas={deltas()}
                use={useCounterDeltaScope}
            >
              {(scope) => {
                readCurrentCount = scope.currentCount;
                return null;
              }}
            </ScopeProvider>
        ),
        host,
    );

    expect(readCurrentCount?.()).toBe(0);

    setDeltas(withOutOfOrderUpdates);

    expect(readCurrentCount?.()).toBe(30);

    dispose();
  });

  it("keeps both client and server deltas when they happen at similar times", () => {
    const ScopeProvider = createScopeProvider<{ deltas: ModelRecord<CounterModel> }>();
    const modelId = "counter-shared";

    const initial = toRecord<CounterModel>([
      {
        modelId,
        type: "create",
        timestamp: 1,
        payload: { count: 0 },
      },
    ]);

    const withServerUpdate = toRecord<CounterModel>([
      {
        modelId,
        type: "create",
        timestamp: 1,
        payload: { count: 0 },
      },
      {
        modelId,
        type: "update",
        timestamp: 101,
        payload: { count: 9 },
      },
    ]);

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(100);

    const useCounterDeltaScope = defineDeltaScope(ScopeProvider, ({ models, push, store }) => {
      // Client-originated change.
      push(modelId, { count: 5 });

      return {
        currentCount: () => models[0]?.count,
        getDeltaCount: () => store.getStreamById(modelId)?.length ?? 0,
      };
    });

    const [deltas, setDeltas] = createSignal<ModelRecord<CounterModel>>(initial);
    let readCurrentCount: (() => number | undefined) | undefined;
    let readDeltaCount: (() => number) | undefined;

    const host = document.createElement("div");
    const dispose = render(
        () => (
            <ScopeProvider
                deltas={deltas()}
                use={useCounterDeltaScope}
            >
              {(scope) => {
                readCurrentCount = scope.currentCount;
                readDeltaCount = scope.getDeltaCount;
                return null;
              }}
            </ScopeProvider>
        ),
        host,
    );

    expect(readCurrentCount?.()).toBe(5);
    expect(readDeltaCount?.()).toBe(2);

    setDeltas(withServerUpdate);

    expect(readCurrentCount?.()).toBe(9);
    expect(readDeltaCount?.()).toBe(3);

    dispose();
    nowSpy.mockRestore();
  });

  it("hydrates when deltas start undefined and arrive later through props", () => {
    const ScopeProvider = createScopeProvider<{ deltas: ModelRecord<CounterModel> }>();

    const incoming = toRecord<CounterModel>([
      {
        modelId: "counter-late",
        type: "create",
        timestamp: 1,
        payload: { count: 7 },
      },
    ]);

    const useCounterDeltaScope = defineDeltaScope(ScopeProvider, ({ models }) => ({
      currentCount: () => models[0]?.count,
    }));

    const [deltas, setDeltas] = createSignal<ModelRecord<CounterModel> | undefined>(undefined);
    let readCurrentCount: (() => number | undefined) | undefined;

    const host = document.createElement("div");
    const dispose = render(
        () => (
            <ScopeProvider
                deltas={deltas() as unknown as ModelRecord<CounterModel>}
                use={useCounterDeltaScope}
            >
              {(scope) => {
                readCurrentCount = scope.currentCount;
                return null;
              }}
            </ScopeProvider>
        ),
        host,
    );

    expect(readCurrentCount?.()).toBeUndefined();

    setDeltas(incoming);

    expect(readCurrentCount?.()).toBe(7);

    dispose();
  });
});
