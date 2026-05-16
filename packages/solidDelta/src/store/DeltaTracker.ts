import {Model} from "@web/schema";
import {createSignal} from "solid-js";
import {ModelDelta} from "../model/ModelDelta";

export type DeltaTrackerReadOptions = {
    suppressCompaction?: boolean
}

export type DeltaTrackerOptions<M extends Model> = {
    trackBy?: (delta: ModelDelta<M>) => string
}

export type DeltaTracker<M extends Model> = {
    get(options?: DeltaTrackerReadOptions): ModelDelta<M>[]
    inverse(options?: DeltaTrackerReadOptions): ModelDelta<M>[]
    mark(delta: ModelDelta<M> | readonly ModelDelta<M>[]): void
    clear(): void
}

export function createDeltaTracker<M extends Model>(
    getDeltas: () => readonly ModelDelta<M>[],
    options?: DeltaTrackerOptions<M>
): DeltaTracker<M> {
    const trackBy = options?.trackBy ?? ((delta: ModelDelta<M>) => `${delta.id}.${delta.path}`);
    const frontier = new Map<string, number>();
    const [revision, setRevision] = createSignal(0);

    function bumpRevision() {
        setRevision(revision() + 1);
    }

    function compact(deltas: readonly ModelDelta<M>[]) {
        const latest = new Map<string, ModelDelta<M>>();

        for (const delta of deltas) {
            const key = trackBy(delta);
            const existing = latest.get(key);

            if (existing == null || existing.timestamp <= delta.timestamp) {
                latest.set(key, delta);
            }
        }

        return Array.from(latest.values());
    }

    function readTracked(tracked: boolean, options?: DeltaTrackerReadOptions) {
        revision();

        const result: ModelDelta<M>[] = [];

        for (const delta of getDeltas()) {
            const timestamp = frontier.get(trackBy(delta)) ?? -Infinity;
            const isTracked = delta.timestamp <= timestamp;

            if (isTracked === tracked) {
                result.push(delta);
            }
        }

        return options?.suppressCompaction ? result : compact(result);
    }

    return {
        get(options) {
            return readTracked(true, options);
        },
        inverse(options) {
            return readTracked(false, options);
        },
        mark(deltaOrDeltas) {
            const deltas = Array.isArray(deltaOrDeltas) ? deltaOrDeltas : [deltaOrDeltas];
            let changed = false;

            for (const delta of deltas) {
                const key = trackBy(delta);
                const timestamp = frontier.get(key);

                if (timestamp == null || timestamp < delta.timestamp) {
                    frontier.set(key, delta.timestamp);
                    changed = true;
                }
            }

            if (changed) {
                bumpRevision();
            }
        },
        clear() {
            if (frontier.size === 0) {
                return;
            }

            frontier.clear();
            bumpRevision();
        }
    };
}
