class NotReadyError extends Error {
    source;
    constructor(source) {
        super();
        this.source = source;
    }
}
class StatusError extends Error {
    source;
    constructor(source, original) {
        super(original instanceof Error ? original.message : String(original), { cause: original });
        this.source = source;
    }
}
class NoOwnerError extends Error {
    constructor() {
        super("Context can only be accessed under a reactive root.");
    }
}
class ContextNotFoundError extends Error {
    constructor() {
        super(
            "Context must either be created with a default value or a value must be provided before accessing it."
        );
    }
}
const REACTIVE_NONE = 0;
const REACTIVE_CHECK = 1 << 0;
const REACTIVE_DIRTY = 1 << 1;
const REACTIVE_RECOMPUTING_DEPS = 1 << 2;
const REACTIVE_IN_HEAP = 1 << 3;
const REACTIVE_IN_HEAP_HEIGHT = 1 << 4;
const REACTIVE_ZOMBIE = 1 << 5;
const REACTIVE_DISPOSED = 1 << 6;
const REACTIVE_OPTIMISTIC_DIRTY = 1 << 7;
const REACTIVE_SNAPSHOT_STALE = 1 << 8;
const REACTIVE_LAZY = 1 << 9;
const REACTIVE_MANUAL_WRITE = 1 << 10;
const CONFIG_OWNED_WRITE = 1 << 0;
const CONFIG_NO_SNAPSHOT = 1 << 1;
const CONFIG_TRANSPARENT = 1 << 2;
const CONFIG_IN_SNAPSHOT_SCOPE = 1 << 3;
const CONFIG_CHILDREN_FORBIDDEN = 1 << 4;
const CONFIG_AUTO_DISPOSE = 1 << 5;
const CONFIG_SYNC = 1 << 6;
const STATUS_PENDING = 1 << 0;
const STATUS_ERROR = 1 << 1;
const STATUS_UNINITIALIZED = 1 << 2;
const EFFECT_RENDER = 1;
const EFFECT_USER = 2;
const EFFECT_TRACKED = 3;
const NOT_PENDING = {};
const NO_SNAPSHOT = {};
const STORE_SNAPSHOT_PROPS = "sp";
const SUPPORTS_PROXY = typeof Proxy === "function";
const defaultContext = {};
const $REFRESH = Symbol("refresh");
const hooks = {};
const diagnosticListeners = new Set();
const diagnosticCaptures = new Set();
let diagnosticSequence = 0;
const diagnostics = {
    subscribe(listener) {
        diagnosticListeners.add(listener);
        return () => diagnosticListeners.delete(listener);
    },
    capture() {
        const events = [];
        diagnosticCaptures.add(events);
        return {
            get events() {
                return events;
            },
            clear() {
                events.length = 0;
            },
            stop() {
                diagnosticCaptures.delete(events);
                return [...events];
            }
        };
    }
};
const DEV$1 = {
    hooks: hooks,
    diagnostics: diagnostics,
    getChildren: getChildren,
    getSignals: getSignals,
    getParent: getParent,
    getSources: getSources,
    getObservers: getObservers
};
function emitDiagnostic(event) {
    const entry = { sequence: ++diagnosticSequence, ...event };
    for (const listener of diagnosticListeners) listener(entry);
    for (const capture of diagnosticCaptures) capture.push(entry);
    return entry;
}
function registerGraph(value, owner) {
    value._owner = owner;
    if (owner) {
        if (!owner._signals) owner._signals = [];
        owner._signals.push(value);
    }
    DEV$1.hooks.onGraph?.(value, owner);
}
function clearSignals(node) {
    node._signals = undefined;
}
function getChildren(owner) {
    const children = [];
    let child = owner._firstChild;
    while (child) {
        children.push(child);
        child = child._nextSibling;
    }
    return children;
}
function getSignals(owner) {
    return owner._signals ? [...owner._signals] : [];
}
function getParent(owner) {
    return owner._parent;
}
function getSources(computation) {
    const sources = [];
    let link = computation._deps;
    while (link) {
        sources.push(link._dep);
        link = link._nextDep;
    }
    return sources;
}
function getObservers(node) {
    const observers = [];
    let link = node._subs;
    while (link) {
        observers.push(link._sub);
        link = link._nextSub;
    }
    return observers;
}
function actualInsertIntoHeap(n, heap) {
    const parentHeight =
        (n._parent?._root ? n._parent._parentComputed?._height : n._parent?._height) ?? -1;
    if (parentHeight >= n._height) n._height = parentHeight + 1;
    const height = n._height;
    const heapAtHeight = heap._heap[height];
    if (heapAtHeight === undefined) heap._heap[height] = n;
    else {
        const tail = heapAtHeight._prevHeap;
        tail._nextHeap = n;
        n._prevHeap = tail;
        heapAtHeight._prevHeap = n;
    }
    if (height > heap._max) heap._max = height;
}
function insertIntoHeap(n, heap) {
    let flags = n._flags;
    if (flags & (REACTIVE_IN_HEAP | REACTIVE_RECOMPUTING_DEPS | REACTIVE_MANUAL_WRITE)) return;
    if (flags & REACTIVE_CHECK) {
        n._flags = (flags & -4) | REACTIVE_DIRTY | REACTIVE_IN_HEAP;
    } else n._flags = flags | REACTIVE_IN_HEAP;
    if (!(flags & REACTIVE_IN_HEAP_HEIGHT)) actualInsertIntoHeap(n, heap);
}
function insertIntoHeapHeight(n, heap) {
    let flags = n._flags;
    if (
        flags &
        (REACTIVE_IN_HEAP | REACTIVE_RECOMPUTING_DEPS | REACTIVE_IN_HEAP_HEIGHT | REACTIVE_MANUAL_WRITE)
    )
        return;
    n._flags = flags | REACTIVE_IN_HEAP_HEIGHT;
    actualInsertIntoHeap(n, heap);
}
function deleteFromHeap(n, heap) {
    const flags = n._flags;
    if (!(flags & (REACTIVE_IN_HEAP | REACTIVE_IN_HEAP_HEIGHT))) return;
    n._flags = flags & -25;
    const height = n._height;
    if (n._prevHeap === n) heap._heap[height] = undefined;
    else {
        const next = n._nextHeap;
        const dhh = heap._heap[height];
        const end = next ?? dhh;
        if (n === dhh) heap._heap[height] = next;
        else n._prevHeap._nextHeap = next;
        end._prevHeap = n._prevHeap;
    }
    n._prevHeap = n;
    n._nextHeap = undefined;
}
function markHeap(heap) {
    if (heap._marked) return;
    heap._marked = true;
    for (let i = 0; i <= heap._max; i++) {
        for (let el = heap._heap[i]; el !== undefined; el = el._nextHeap) {
            if (el._flags & REACTIVE_IN_HEAP) markNode(el);
        }
    }
}
function markNode(el, newState = REACTIVE_DIRTY) {
    const flags = el._flags;
    if ((flags & (REACTIVE_CHECK | REACTIVE_DIRTY)) >= newState) return;
    el._flags = (flags & -4) | newState;
    for (let link = el._subs; link !== null; link = link._nextSub) {
        markNode(link._sub, REACTIVE_CHECK);
    }
    if (el._child !== null) {
        for (let child = el._child; child !== null; child = child._nextChild) {
            for (let link = child._subs; link !== null; link = link._nextSub) {
                markNode(link._sub, REACTIVE_CHECK);
            }
        }
    }
}
function runHeap(heap, recompute) {
    heap._marked = false;
    for (heap._min = 0; heap._min <= heap._max; heap._min++) {
        let el = heap._heap[heap._min];
        while (el !== undefined) {
            if (el._flags & REACTIVE_IN_HEAP) recompute(el);
            else adjustHeight(el, heap);
            el = heap._heap[heap._min];
        }
    }
    heap._max = 0;
}
function adjustHeight(el, heap) {
    deleteFromHeap(el, heap);
    let newHeight = el._height;
    for (let d = el._deps; d; d = d._nextDep) {
        const dep1 = d._dep;
        const dep = dep1._firewall || dep1;
        if (dep._fn && dep._height >= newHeight) newHeight = dep._height + 1;
    }
    if (el._height !== newHeight) {
        el._height = newHeight;
        for (let s = el._subs; s !== null; s = s._nextSub) {
            insertIntoHeapHeight(s._sub, heap);
        }
    }
}
const signalLanes = new WeakMap();
const activeLanes = new Set();
function getOrCreateLane(signal) {
    let lane = signalLanes.get(signal);
    if (lane) {
        return findLane(lane);
    }
    const parentSource = signal._parentSource;
    const parentLane = parentSource?._optimisticLane ? findLane(parentSource._optimisticLane) : null;
    lane = {
        _source: signal,
        _pendingAsync: new Set(),
        _effectQueues: [[], []],
        _mergedInto: null,
        _transition: activeTransition,
        _parentLane: parentLane
    };
    signalLanes.set(signal, lane);
    activeLanes.add(lane);
    signal._overrideSinceLane = false;
    return lane;
}
function findLane(lane) {
    while (lane._mergedInto) lane = lane._mergedInto;
    return lane;
}
function mergeLanes(lane1, lane2) {
    lane1 = findLane(lane1);
    lane2 = findLane(lane2);
    if (lane1 === lane2) return lane1;
    lane2._mergedInto = lane1;
    for (const node of lane2._pendingAsync) lane1._pendingAsync.add(node);
    lane1._effectQueues[0].push(...lane2._effectQueues[0]);
    lane1._effectQueues[1].push(...lane2._effectQueues[1]);
    return lane1;
}
function resolveLane(el) {
    const lane = el._optimisticLane;
    if (!lane) return undefined;
    const root = findLane(lane);
    if (activeLanes.has(root)) return root;
    el._optimisticLane = undefined;
    return undefined;
}
function resolveTransition(el) {
    return resolveLane(el)?._transition ?? el._transition;
}
function hasActiveOverride(el) {
    return !!(el._overrideValue !== undefined && el._overrideValue !== NOT_PENDING);
}
function assignOrMergeLane(el, sourceLane) {
    const sourceRoot = findLane(sourceLane);
    const existing = el._optimisticLane;
    if (existing) {
        if (existing._mergedInto) {
            el._optimisticLane = sourceLane;
            return;
        }
        const existingRoot = findLane(existing);
        if (activeLanes.has(existingRoot)) {
            if (existingRoot !== sourceRoot && !hasActiveOverride(el)) {
                if (sourceRoot._parentLane && findLane(sourceRoot._parentLane) === existingRoot) {
                    el._optimisticLane = sourceLane;
                } else if (existingRoot._parentLane && findLane(existingRoot._parentLane) === sourceRoot);
                else mergeLanes(sourceRoot, existingRoot);
            }
            return;
        }
    }
    el._optimisticLane = sourceLane;
}
const transitions = new Set();
const dirtyQueue = { _heap: new Array(2e3).fill(undefined), _marked: false, _min: 0, _max: 0 };
const zombieQueue = { _heap: new Array(2e3).fill(undefined), _marked: false, _min: 0, _max: 0 };
let clock = 0;
let activeTransition = null;
let scheduled = false;
let syncDepth = 0;
let projectionWriteActive = false;
let inTrackedQueueCallback = false;
let _enforceLoadingBoundary = false;
let _hitUnhandledAsync = false;
let stashedOptimisticReads = null;
const transientStoreNodes = new Set();
function registerTransientStoreNode(node) {
    transientStoreNodes.add(node);
}
function canUseSimpleSyncFlush(queue) {
    return (
        transitions.size === 0 &&
        activeLanes.size === 0 &&
        queue._children.length === 0 &&
        queue._optimisticNodes.length === 0 &&
        queue._optimisticStores.size === 0 &&
        transientStoreNodes.size === 0
    );
}
function sweepTransientStoreNodes() {
    if (transientStoreNodes.size === 0) return;
    for (const node of transientStoreNodes) {
        if (node._subs !== null) {
            transientStoreNodes.delete(node);
            continue;
        }
        if (node._pendingValue !== NOT_PENDING) continue;
        if (node._overrideValue !== undefined && node._overrideValue !== NOT_PENDING) continue;
        transientStoreNodes.delete(node);
        node._unobserved?.();
    }
}
function resetUnhandledAsync() {
    _hitUnhandledAsync = false;
}
function enforceLoadingBoundary(enabled) {
    _enforceLoadingBoundary = enabled;
}
function shouldReadStashedOptimisticValue(node) {
    return !!stashedOptimisticReads?.has(node);
}
function runLaneEffects(type) {
    for (const lane of activeLanes) {
        if (lane._mergedInto || lane._pendingAsync.size > 0) continue;
        const effects = lane._effectQueues[type - 1];
        if (effects.length) {
            lane._effectQueues[type - 1] = [];
            runQueue(effects, type);
        }
    }
}
function queueStashedOptimisticEffects(node) {
    for (let s = node._subs; s !== null; s = s._nextSub) {
        const sub = s._sub;
        if (!sub._type) continue;
        if (sub._type === EFFECT_TRACKED) {
            if (!sub._modified) {
                sub._modified = true;
                sub._queue.enqueue(EFFECT_USER, sub._run);
            }
            continue;
        }
        const queue = sub._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
        if (queue._min > sub._height) queue._min = sub._height;
        insertIntoHeap(sub, queue);
    }
}
function setProjectionWriteActive(value) {
    projectionWriteActive = value;
}
function setTrackedQueueCallback(value) {
    inTrackedQueueCallback = value;
}
function mergeTransitionState(target, outgoing) {
    outgoing._done = target;
    target._actions.push(...outgoing._actions);
    for (const lane of activeLanes) if (lane._transition === outgoing) lane._transition = target;
    target._optimisticNodes.push(...outgoing._optimisticNodes);
    for (const store of outgoing._optimisticStores) target._optimisticStores.add(store);
    for (const [source, reporters] of outgoing._asyncReporters) {
        let targetReporters = target._asyncReporters.get(source);
        if (!targetReporters) target._asyncReporters.set(source, (targetReporters = new Set()));
        for (const reporter of reporters) targetReporters.add(reporter);
    }
    for (const sub of outgoing._gatedSubs) target._gatedSubs.add(sub);
}
function resolveOptimisticNodes(nodes) {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node._optimisticLane = undefined;
        if (node._pendingValue !== NOT_PENDING) {
            node._value = node._pendingValue;
            node._pendingValue = NOT_PENDING;
        }
        const prevOverride = node._overrideValue;
        node._overrideValue = NOT_PENDING;
        if (prevOverride !== NOT_PENDING && node._value !== prevOverride) insertSubs(node, true);
        node._transition = null;
    }
    nodes.length = 0;
}
function cleanupCompletedLanes(completingTransition) {
    for (const lane of activeLanes) {
        const owned = completingTransition
            ? lane._transition === completingTransition
            : !lane._transition;
        if (!owned) continue;
        if (!lane._mergedInto) {
            if (lane._effectQueues[0].length) runQueue(lane._effectQueues[0], EFFECT_RENDER);
            if (lane._effectQueues[1].length) runQueue(lane._effectQueues[1], EFFECT_USER);
        }
        if (lane._source._optimisticLane === lane) lane._source._optimisticLane = undefined;
        lane._pendingAsync.clear();
        lane._effectQueues[0].length = 0;
        lane._effectQueues[1].length = 0;
        activeLanes.delete(lane);
        signalLanes.delete(lane._source);
    }
}
function schedule() {
    if (scheduled) return;
    scheduled = true;
    if (!syncDepth && !globalQueue._running && !projectionWriteActive) queueMicrotask(flush);
}
class Queue {
    _parent = null;
    _queues = [[], []];
    _children = [];
    created = clock;
    addChild(child) {
        this._children.push(child);
        child._parent = this;
    }
    removeChild(child) {
        const index = this._children.indexOf(child);
        if (index >= 0) {
            this._children.splice(index, 1);
            child._parent = null;
        }
    }
    notify(node, mask, flags, error) {
        if (this._parent) return this._parent.notify(node, mask, flags, error);
        return false;
    }
    run(type) {
        if (this._queues[type - 1].length) {
            const effects = this._queues[type - 1];
            this._queues[type - 1] = [];
            runQueue(effects, type);
        }
        for (let i = 0; i < this._children.length; i++) this._children[i].run?.(type);
    }
    enqueue(type, fn) {
        if (type) {
            if (currentOptimisticLane) {
                const lane = findLane(currentOptimisticLane);
                lane._effectQueues[type - 1].push(fn);
            } else {
                this._queues[type - 1].push(fn);
            }
        }
        schedule();
    }
    stashQueues(stub) {
        stub._queues[0].push(...this._queues[0]);
        stub._queues[1].push(...this._queues[1]);
        this._queues = [[], []];
        for (let i = 0; i < this._children.length; i++) {
            let child = this._children[i];
            let childStub = stub._children[i];
            if (!childStub) {
                childStub = { _queues: [[], []], _children: [] };
                stub._children[i] = childStub;
            }
            child.stashQueues(childStub);
        }
    }
    restoreQueues(stub) {
        this._queues[0].push(...stub._queues[0]);
        this._queues[1].push(...stub._queues[1]);
        for (let i = 0; i < stub._children.length; i++) {
            const childStub = stub._children[i];
            let child = this._children[i];
            if (child) child.restoreQueues(childStub);
        }
    }
}
class GlobalQueue extends Queue {
    _running = false;
    _pendingNode = null;
    _pendingNodes = [];
    _optimisticNodes = [];
    _optimisticStores = new Set();
    static _update;
    static _dispose;
    static _runEffect;
    static _clearOptimisticStore = null;
    flush() {
        if (this._running) return;
        this._running = true;
        try {
            runHeap(dirtyQueue, GlobalQueue._update);
            if (activeTransition) {
                const isComplete = transitionComplete(activeTransition);
                if (!isComplete) {
                    const stashedTransition = activeTransition;
                    runHeap(zombieQueue, GlobalQueue._update);
                    this._pendingNode = null;
                    this._pendingNodes = [];
                    this._optimisticNodes = [];
                    this._optimisticStores = new Set();
                    runLaneEffects(EFFECT_RENDER);
                    runLaneEffects(EFFECT_USER);
                    this.stashQueues(stashedTransition._queueStash);
                    clock++;
                    scheduled = dirtyQueue._max >= dirtyQueue._min;
                    reassignPendingTransition(stashedTransition._pendingNodes);
                    activeTransition = null;
                    if (
                        !stashedTransition._actions.length &&
                        !stashedTransition._asyncReporters.size &&
                        stashedTransition._optimisticNodes.length
                    ) {
                        stashedOptimisticReads = new Set();
                        for (let i = 0; i < stashedTransition._optimisticNodes.length; i++) {
                            const node = stashedTransition._optimisticNodes[i];
                            if (node._fn || node._config & CONFIG_OWNED_WRITE) continue;
                            stashedOptimisticReads.add(node);
                            queueStashedOptimisticEffects(node);
                        }
                    }
                    try {
                        finalizePureQueue(null, true);
                    } finally {
                        stashedOptimisticReads = null;
                    }
                    return;
                }
                this._pendingNodes !== activeTransition._pendingNodes &&
                this._pendingNodes.push(...activeTransition._pendingNodes);
                this.restoreQueues(activeTransition._queueStash);
                transitions.delete(activeTransition);
                const completingTransition = activeTransition;
                activeTransition = null;
                reassignPendingTransition(this._pendingNodes);
                finalizePureQueue(completingTransition);
            } else {
                if (canUseSimpleSyncFlush(this)) {
                    commitPendingNodes();
                    if (dirtyQueue._max >= dirtyQueue._min) {
                        runHeap(dirtyQueue, GlobalQueue._update);
                        commitPendingNodes();
                    }
                } else {
                    if (transitions.size) runHeap(zombieQueue, GlobalQueue._update);
                    finalizePureQueue();
                }
            }
            clock++;
            scheduled = dirtyQueue._max >= dirtyQueue._min;
            activeLanes.size && runLaneEffects(EFFECT_RENDER);
            this.run(EFFECT_RENDER);
            activeLanes.size && runLaneEffects(EFFECT_USER);
            this.run(EFFECT_USER);
            if (true) DEV$1.hooks.onUpdate?.();
        } finally {
            this._running = false;
        }
    }
    notify(node, mask, flags, error) {
        if (mask & STATUS_PENDING) {
            if (flags & STATUS_PENDING) {
                const actualError = error !== undefined ? error : node._error;
                if (activeTransition && actualError) {
                    const source = actualError.source;
                    let reporters = activeTransition._asyncReporters.get(source);
                    if (!reporters) activeTransition._asyncReporters.set(source, (reporters = new Set()));
                    const prevSize = reporters.size;
                    reporters.add(node);
                    if (reporters.size !== prevSize) schedule();
                }
                if (_enforceLoadingBoundary) _hitUnhandledAsync = true;
            }
            return true;
        }
        return false;
    }
    initTransition(transition) {
        if (transition) transition = currentTransition(transition);
        if (transition && transition === activeTransition) return;
        if (!transition && activeTransition && activeTransition._time === clock) return;
        if (!activeTransition) {
            activeTransition = transition ?? {
                _time: clock,
                _pendingNodes: [],
                _asyncReporters: new Map(),
                _optimisticNodes: [],
                _optimisticStores: new Set(),
                _actions: [],
                _queueStash: { _queues: [[], []], _children: [] },
                _done: false,
                _gatedSubs: new Set()
            };
        } else if (transition) {
            const outgoing = activeTransition;
            mergeTransitionState(transition, outgoing);
            transitions.delete(outgoing);
            activeTransition = transition;
        }
        transitions.add(activeTransition);
        activeTransition._time = clock;
        if (this._pendingNode !== null) {
            this._pendingNode._transition = activeTransition;
            activeTransition._pendingNodes.push(this._pendingNode);
            this._pendingNode = null;
        }
        if (this._pendingNodes !== activeTransition._pendingNodes) {
            for (let i = 0; i < this._pendingNodes.length; i++) {
                const node = this._pendingNodes[i];
                node._transition = activeTransition;
                activeTransition._pendingNodes.push(node);
            }
            this._pendingNodes = activeTransition._pendingNodes;
        }
        if (this._optimisticNodes !== activeTransition._optimisticNodes) {
            for (let i = 0; i < this._optimisticNodes.length; i++) {
                const node = this._optimisticNodes[i];
                node._transition = activeTransition;
                activeTransition._optimisticNodes.push(node);
            }
            this._optimisticNodes = activeTransition._optimisticNodes;
        }
        for (const lane of activeLanes) {
            if (!lane._transition) lane._transition = activeTransition;
        }
        if (this._optimisticStores !== activeTransition._optimisticStores) {
            for (const store of this._optimisticStores) activeTransition._optimisticStores.add(store);
            this._optimisticStores = activeTransition._optimisticStores;
        }
    }
}
function queuePendingNode(node) {
    if (activeTransition) {
        globalQueue._pendingNodes.push(node);
        return;
    }
    if (globalQueue._pendingNode === null && globalQueue._pendingNodes.length === 0) {
        globalQueue._pendingNode = node;
        return;
    }
    if (globalQueue._pendingNode !== null) {
        globalQueue._pendingNodes.push(globalQueue._pendingNode);
        globalQueue._pendingNode = null;
    }
    globalQueue._pendingNodes.push(node);
}
function insertSubs(node, optimistic = false) {
    const sourceLane = node._optimisticLane || currentOptimisticLane;
    const hasSnapshot = node._snapshotValue !== undefined;
    for (let s = node._subs; s !== null; s = s._nextSub) {
        if (hasSnapshot && s._sub._config & CONFIG_IN_SNAPSHOT_SCOPE) {
            s._sub._flags |= REACTIVE_SNAPSHOT_STALE;
            continue;
        }
        if (optimistic && sourceLane) {
            s._sub._flags |= REACTIVE_OPTIMISTIC_DIRTY;
            assignOrMergeLane(s._sub, sourceLane);
        } else if (optimistic) {
            s._sub._flags |= REACTIVE_OPTIMISTIC_DIRTY;
            s._sub._optimisticLane = undefined;
        }
        const sub = s._sub;
        if (sub._type === EFFECT_TRACKED) {
            if (!sub._modified) {
                sub._modified = true;
                sub._queue.enqueue(EFFECT_USER, sub._run);
            }
            continue;
        }
        const queue = s._sub._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
        if (queue._min > s._sub._height) queue._min = s._sub._height;
        insertIntoHeap(s._sub, queue);
    }
}
function commitPendingNode(n) {
    const c = n;
    if (!c._fn) {
        if (n._pendingValue !== NOT_PENDING) {
            n._value = n._pendingValue;
            n._pendingValue = NOT_PENDING;
        }
        return;
    }
    if (n._pendingValue !== NOT_PENDING) {
        n._value = n._pendingValue;
        n._pendingValue = NOT_PENDING;
        if (n._type && n._type !== EFFECT_TRACKED) n._modified = true;
    }
    c._flags &= ~REACTIVE_MANUAL_WRITE;
    if (!(c._statusFlags & STATUS_PENDING)) c._statusFlags &= ~STATUS_UNINITIALIZED;
    if (c._pendingFirstChild !== null || c._pendingDisposal !== null)
        GlobalQueue._dispose(c, false, true);
}
function commitPendingNodes() {
    if (globalQueue._pendingNode !== null) {
        commitPendingNode(globalQueue._pendingNode);
        globalQueue._pendingNode = null;
    }
    const pendingNodes = globalQueue._pendingNodes;
    for (let i = 0; i < pendingNodes.length; i++) {
        commitPendingNode(pendingNodes[i]);
    }
    pendingNodes.length = 0;
}
function finalizePureQueue(completingTransition = null, incomplete = false) {
    const resolvePending = !incomplete;
    if (resolvePending) commitPendingNodes();
    if (!incomplete && globalQueue._children.length) checkBoundaryChildren(globalQueue);
    const ranHeap = dirtyQueue._max >= dirtyQueue._min;
    if (ranHeap) runHeap(dirtyQueue, GlobalQueue._update);
    if (resolvePending) {
        if (ranHeap) commitPendingNodes();
        resolveOptimisticNodes(
            completingTransition ? completingTransition._optimisticNodes : globalQueue._optimisticNodes
        );
        if (completingTransition && completingTransition._gatedSubs.size) {
            for (const sub of completingTransition._gatedSubs) {
                if (sub._flags & REACTIVE_DISPOSED) continue;
                if (sub._type === EFFECT_TRACKED) {
                    if (!sub._modified) {
                        sub._modified = true;
                        sub._queue.enqueue(EFFECT_USER, sub._run);
                    }
                    continue;
                }
                const queue = sub._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
                if (queue._min > sub._height) queue._min = sub._height;
                insertIntoHeap(sub, queue);
            }
            completingTransition._gatedSubs.clear();
        }
        const optimisticStores = completingTransition
            ? completingTransition._optimisticStores
            : globalQueue._optimisticStores;
        if (GlobalQueue._clearOptimisticStore && optimisticStores.size) {
            for (const store of optimisticStores) {
                GlobalQueue._clearOptimisticStore(store);
            }
            optimisticStores.clear();
            schedule();
        }
        sweepTransientStoreNodes();
        cleanupCompletedLanes(completingTransition);
    }
}
function checkBoundaryChildren(queue) {
    for (const child of queue._children) {
        child.checkSources?.();
        checkBoundaryChildren(child);
    }
}
function trackOptimisticStore(store) {
    globalQueue._optimisticStores.add(store);
    schedule();
}
function reassignPendingTransition(pendingNodes) {
    for (let i = 0; i < pendingNodes.length; i++) {
        pendingNodes[i]._transition = activeTransition;
    }
}
const globalQueue = new GlobalQueue();
function flush(fn) {
    if (fn) {
        syncDepth++;
        try {
            return fn();
        } finally {
            flush();
            syncDepth--;
        }
    }
    if (globalQueue._running) {
        if (inTrackedQueueCallback) {
            throw new Error(
                "Cannot call flush() from inside onSettled or createTrackedEffect. flush() is not reentrant there."
            );
        }
        return;
    }
    let count = 0;
    while (scheduled || activeTransition) {
        if (++count === 1e5) throw new Error("Potential Infinite Loop Detected.");
        globalQueue.flush();
    }
}
function runQueue(queue, type) {
    for (let i = 0; i < queue.length; i++) queue[i](type);
}
function reporterBlocksSource(reporter, source) {
    if (reporter._flags & (REACTIVE_ZOMBIE | REACTIVE_DISPOSED)) return false;
    if (reporter._pendingSource === source || reporter._pendingSources?.has(source)) return true;
    for (let dep = reporter._deps; dep; dep = dep._nextDep) {
        let current = dep._dep;
        while (current) {
            if (current === source || current._firewall === source) return true;
            current = current._parentSource;
        }
    }
    return !!(
        reporter._statusFlags & STATUS_PENDING &&
        reporter._error instanceof NotReadyError &&
        reporter._error.source === source
    );
}
function transitionComplete(transition) {
    if (transition._done) return true;
    if (transition._actions.length) return false;
    let done = true;
    for (const [source, reporters] of transition._asyncReporters) {
        let hasLive = false;
        for (const reporter of reporters) {
            if (reporterBlocksSource(reporter, source)) {
                hasLive = true;
                break;
            }
            reporters.delete(reporter);
        }
        if (!hasLive) transition._asyncReporters.delete(source);
        else if (source._statusFlags & STATUS_PENDING && source._error?.source === source) {
            done = false;
            break;
        }
    }
    if (done) {
        for (let i = 0; i < transition._optimisticNodes.length; i++) {
            const node = transition._optimisticNodes[i];
            if (
                hasActiveOverride(node) &&
                "_statusFlags" in node &&
                node._statusFlags & STATUS_PENDING &&
                node._error instanceof NotReadyError &&
                node._error.source !== node
            ) {
                done = false;
                break;
            }
        }
    }
    done && (transition._done = true);
    return done;
}
function currentTransition(transition) {
    while (transition._done && typeof transition._done === "object") transition = transition._done;
    return transition;
}
function setActiveTransition(transition) {
    activeTransition = transition;
}
function runInTransition(transition, fn) {
    const prevTransition = activeTransition;
    try {
        activeTransition = currentTransition(transition);
        return fn();
    } finally {
        activeTransition = prevTransition;
    }
}
const PENDING_OWNER = {};
function markDisposal(el) {
    let child = el._firstChild;
    while (child) {
        child._flags |= REACTIVE_ZOMBIE;
        if (child._flags & REACTIVE_IN_HEAP) {
            deleteFromHeap(child, dirtyQueue);
            insertIntoHeap(child, zombieQueue);
        }
        markDisposal(child);
        child = child._nextSibling;
    }
}
function dispose(node) {
    let toRemove = node._deps || null;
    do {
        toRemove = unlinkSubs(toRemove);
    } while (toRemove !== null);
    node._deps = null;
    node._depsTail = null;
    disposeChildren(node, true);
}
function disposeChildren(node, self = false, zombie) {
    const flags = node._flags;
    if (flags & REACTIVE_DISPOSED) return;
    if (self) node._flags = flags | REACTIVE_DISPOSED;
    if (self && true) clearSignals(node);
    if (self && node._fn) node._inFlight = null;
    let child = zombie ? node._pendingFirstChild : node._firstChild;
    while (child) {
        const nextChild = child._nextSibling;
        if (child._deps) {
            const n = child;
            deleteFromHeap(n, n._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
            let toRemove = n._deps;
            do {
                toRemove = unlinkSubs(toRemove);
            } while (toRemove !== null);
            n._deps = null;
            n._depsTail = null;
        }
        disposeChildren(child, true);
        child = nextChild;
    }
    if (zombie) {
        node._pendingFirstChild = null;
    } else {
        node._firstChild = null;
        node._childCount = 0;
    }
    if (
        self &&
        !zombie &&
        !(flags & REACTIVE_ZOMBIE) &&
        node._parent !== null &&
        !(node._parent._flags & REACTIVE_DISPOSED)
    ) {
        const prev = node._prevSibling;
        const next = node._nextSibling;
        if (prev !== null) prev._nextSibling = next;
        else node._parent._firstChild = next;
        if (next !== null) next._prevSibling = prev;
        node._prevSibling = null;
    }
    runDisposal(node, zombie);
}
function runDisposal(node, zombie) {
    let disposal = zombie ? node._pendingDisposal : node._disposal;
    if (!disposal) return;
    if (Array.isArray(disposal)) {
        for (let i = 0; i < disposal.length; i++) {
            const callable = disposal[i];
            callable.call(callable);
        }
    } else {
        disposal.call(disposal);
    }
    zombie ? (node._pendingDisposal = null) : (node._disposal = null);
}
function childId(owner, consume) {
    let counter = owner;
    while (counter._config & CONFIG_TRANSPARENT && counter._parent) counter = counter._parent;
    if (counter.id != null)
        return formatId(counter.id, consume ? counter._childCount++ : counter._childCount);
    throw new Error("Cannot get child id from owner without an id");
}
function getNextChildId(owner) {
    return childId(owner, true);
}
function peekNextChildId(owner) {
    return childId(owner, false);
}
function formatId(prefix, id) {
    const num = id.toString(36),
        len = num.length - 1;
    return prefix + (len ? String.fromCharCode(64 + len) : "") + num;
}
function getObserver() {
    if (pendingCheckActive || latestReadActive) return PENDING_OWNER;
    return tracking ? context : null;
}
function getOwner() {
    return context;
}
function cleanup(fn) {
    if (!context) return fn;
    if (!context._disposal) context._disposal = fn;
    else if (Array.isArray(context._disposal)) context._disposal.push(fn);
    else context._disposal = [context._disposal, fn];
    return fn;
}
function isDisposed(node) {
    return !!(node._flags & (REACTIVE_DISPOSED | REACTIVE_ZOMBIE));
}
function disposeRootSelf(self = true) {
    disposeChildren(this, self);
}
function createOwner(options) {
    const parent = context;
    const transparent = options?.transparent ?? false;
    const owner = {
        id:
            options?.id ??
            (transparent ? parent?.id : parent?.id != null ? getNextChildId(parent) : undefined),
        _config: transparent ? CONFIG_TRANSPARENT : 0,
        _root: true,
        _parentComputed: parent?._root ? parent._parentComputed : parent,
        _firstChild: null,
        _nextSibling: null,
        _prevSibling: null,
        _disposal: null,
        _queue: parent?._queue ?? globalQueue,
        _context: parent?._context || defaultContext,
        _childCount: 0,
        _pendingDisposal: null,
        _pendingFirstChild: null,
        _parent: parent,
        dispose: disposeRootSelf
    };
    if (parent && parent._config & CONFIG_CHILDREN_FORBIDDEN) {
        emitDiagnostic({
            code: "PRIMITIVE_IN_FORBIDDEN_SCOPE",
            kind: "lifecycle",
            severity: "error",
            message: PRIMITIVE_IN_FORBIDDEN_SCOPE_MESSAGE,
            ownerId: parent.id,
            ownerName: parent._name
        });
        throw new Error(PRIMITIVE_IN_FORBIDDEN_SCOPE_MESSAGE);
    }
    if (parent) {
        const lastChild = parent._firstChild;
        if (lastChild === null) {
            parent._firstChild = owner;
        } else {
            owner._nextSibling = lastChild;
            lastChild._prevSibling = owner;
            parent._firstChild = owner;
        }
    }
    DEV$1.hooks.onOwner?.(owner);
    return owner;
}
function createRoot(init, options) {
    const owner = createOwner(options);
    return runWithOwner(owner, () => init(() => owner.dispose()));
}
function unlinkSubs(link) {
    const dep = link._dep;
    const nextDep = link._nextDep;
    const nextSub = link._nextSub;
    const prevSub = link._prevSub;
    if (nextSub !== null) nextSub._prevSub = prevSub;
    else dep._subsTail = prevSub;
    if (prevSub !== null) prevSub._nextSub = nextSub;
    else {
        dep._subs = nextSub;
        if (nextSub === null) {
            dep._unobserved?.();
            const c = dep;
            c._fn && c._config & CONFIG_AUTO_DISPOSE && !(c._flags & REACTIVE_ZOMBIE) && unobserved(c);
        }
    }
    return nextDep;
}
function trimStaleDeps(el) {
    const depsTail = el._depsTail;
    let toRemove = depsTail !== null ? depsTail._nextDep : el._deps;
    if (toRemove !== null) {
        do {
            toRemove = unlinkSubs(toRemove);
        } while (toRemove !== null);
        if (depsTail !== null) depsTail._nextDep = null;
        else el._deps = null;
    }
}
function unobserved(el) {
    deleteFromHeap(el, el._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
    let dep = el._deps;
    while (dep !== null) {
        dep = unlinkSubs(dep);
    }
    el._deps = null;
    el._depsTail = null;
    disposeChildren(el, true);
}
function link(dep, sub) {
    const prevDep = sub._depsTail;
    if (prevDep !== null && prevDep._dep === dep) return;
    let nextDep = null;
    const isRecomputing = sub._flags & REACTIVE_RECOMPUTING_DEPS;
    if (isRecomputing) {
        nextDep = prevDep !== null ? prevDep._nextDep : sub._deps;
        if (nextDep !== null && nextDep._dep === dep) {
            sub._depsTail = nextDep;
            return;
        }
    }
    const prevSub = dep._subsTail;
    if (prevSub !== null && prevSub._sub === sub && (!isRecomputing || isValidLink(prevSub, sub)))
        return;
    const newLink =
        (sub._depsTail =
            dep._subsTail =
                { _dep: dep, _sub: sub, _nextDep: nextDep, _prevSub: prevSub, _nextSub: null });
    if (prevDep !== null) prevDep._nextDep = newLink;
    else sub._deps = newLink;
    if (prevSub !== null) prevSub._nextSub = newLink;
    else dep._subs = newLink;
}
function isValidLink(checkLink, sub) {
    const depsTail = sub._depsTail;
    if (depsTail !== null) {
        let link = sub._deps;
        do {
            if (link === checkLink) return true;
            if (link === depsTail) break;
            link = link._nextDep;
        } while (link !== null);
    }
    return false;
}
function addPendingSource(el, source) {
    if (el._pendingSource === source || el._pendingSources?.has(source)) return false;
    if (!el._pendingSource) {
        el._pendingSource = source;
        return true;
    }
    if (!el._pendingSources) {
        el._pendingSources = new Set([el._pendingSource, source]);
    } else {
        el._pendingSources.add(source);
    }
    el._pendingSource = undefined;
    return true;
}
function removePendingSource(el, source) {
    if (el._pendingSource) {
        if (el._pendingSource !== source) return false;
        el._pendingSource = undefined;
        return true;
    }
    if (!el._pendingSources?.delete(source)) return false;
    if (el._pendingSources.size === 1) {
        el._pendingSource = el._pendingSources.values().next().value;
        el._pendingSources = undefined;
    } else if (el._pendingSources.size === 0) {
        el._pendingSources = undefined;
    }
    return true;
}
function clearPendingSources(el) {
    el._pendingSource = undefined;
    el._pendingSources?.clear();
    el._pendingSources = undefined;
}
function setPendingError(el, source, error) {
    if (!source) {
        el._error = null;
        return;
    }
    if (error instanceof NotReadyError && error.source === source) {
        el._error = error;
        return;
    }
    const current = el._error;
    if (!(current instanceof NotReadyError) || current.source !== source) {
        el._error = new NotReadyError(source);
    }
}
function forEachDependent(el, fn) {
    for (let s = el._subs; s !== null; s = s._nextSub) fn(s._sub);
    for (let child = el._child; child !== null; child = child._nextChild) {
        for (let s = child._subs; s !== null; s = s._nextSub) fn(s._sub);
    }
}
function settlePendingSource(el) {
    let scheduled = false;
    const visited = new Set();
    const settle = node => {
        if (visited.has(node) || !removePendingSource(node, el)) return;
        visited.add(node);
        node._time = clock;
        const source = node._pendingSource ?? node._pendingSources?.values().next().value;
        if (source) {
            setPendingError(node, source);
            updatePendingSignal(node);
        } else {
            node._statusFlags &= ~STATUS_PENDING;
            setPendingError(node);
            updatePendingSignal(node);
            if (node._blocked) {
                if (node._type === EFFECT_TRACKED) {
                    const tracked = node;
                    if (!tracked._modified) {
                        tracked._modified = true;
                        tracked._queue.enqueue(EFFECT_USER, tracked._run);
                    }
                } else {
                    const queue = node._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue;
                    if (queue._min > node._height) queue._min = node._height;
                    insertIntoHeap(node, queue);
                }
                scheduled = true;
            }
            node._blocked = false;
        }
        forEachDependent(node, settle);
    };
    forEachDependent(el, settle);
    if (scheduled) schedule();
}
function handleAsync(el, result, setter) {
    let iterator = false;
    let isThenable = false;
    if (typeof result === "object" && result !== null) {
        untrack(() => {
            iterator = result[Symbol.asyncIterator];
            isThenable = !iterator && typeof result.then === "function";
        });
    }
    if (!isThenable && !iterator) {
        el._inFlight = null;
        return result;
    }
    if (el._config & CONFIG_SYNC) {
        const message =
            `[SYNC_NODE_RECEIVED_ASYNC] A computed/effect created with \`sync: true\` returned ` +
            `${isThenable ? "a Promise" : "an AsyncIterable"}. The value would be stored as-is and ` +
            `never awaited in production; remove \`sync: true\` to use async-aware behavior, or ` +
            `unwrap the value before returning.`;
        emitDiagnostic({
            code: "SYNC_NODE_RECEIVED_ASYNC",
            kind: "lifecycle",
            severity: "error",
            message: message,
            ownerId: el.id,
            ownerName: el._name
        });
        throw new Error(message);
    }
    el._inFlight = result;
    let syncValue;
    const handleError = error => {
        if (el._inFlight !== result) return;
        globalQueue.initTransition(resolveTransition(el));
        notifyStatus(el, error instanceof NotReadyError ? STATUS_PENDING : STATUS_ERROR, error);
        el._time = clock;
    };
    const asyncWrite = (value, then) => {
        if (el._inFlight !== result) return;
        if (el._flags & (REACTIVE_DIRTY | REACTIVE_OPTIMISTIC_DIRTY)) return;
        globalQueue.initTransition(resolveTransition(el));
        const wasUninitialized = !!(el._statusFlags & STATUS_UNINITIALIZED);
        trimStaleDeps(el);
        clearStatus(el);
        const lane = resolveLane(el);
        if (lane) lane._pendingAsync.delete(el);
        if (setter) setter(value);
        else if (el._overrideValue !== undefined) {
            if (el._overrideValue !== undefined && el._overrideValue !== NOT_PENDING)
                el._pendingValue = value;
            else {
                el._value = value;
                insertSubs(el);
            }
            el._time = clock;
        } else if (lane) {
            const isEffect = el._type;
            const prevValue = el._value;
            const equals = el._equals;
            if ((!isEffect && wasUninitialized) || !equals || !equals(value, prevValue)) {
                el._value = value;
                el._time = clock;
                if (el._latestValueComputed) {
                    setSignal(el._latestValueComputed, value);
                }
                insertSubs(el, true);
            }
        } else {
            setSignal(el, () => value);
        }
        settlePendingSource(el);
        schedule();
        flush();
        then?.();
    };
    if (isThenable) {
        let resolved = false,
            isSync = true;
        result.then(
            v => {
                if (isSync) {
                    syncValue = v;
                    resolved = true;
                } else asyncWrite(v);
            },
            e => {
                if (!isSync) handleError(e);
            }
        );
        isSync = false;
        if (!resolved) {
            globalQueue.initTransition(resolveTransition(el));
            throw new NotReadyError(context);
        }
    }
    if (iterator) {
        const it = result[Symbol.asyncIterator]();
        let hadSyncValue = false;
        let completed = false;
        cleanup(() => {
            if (completed) return;
            completed = true;
            try {
                const returned = it.return?.();
                if (returned && typeof returned.then === "function") {
                    returned.then(undefined, () => {});
                }
            } catch {}
        });
        const iterate = () => {
            let syncResult,
                resolved = false,
                isSync = true;
            it.next().then(
                r => {
                    if (isSync) {
                        syncResult = r;
                        resolved = true;
                        if (r.done) completed = true;
                    } else if (el._inFlight !== result) {
                        return;
                    } else if (!r.done) asyncWrite(r.value, iterate);
                    else {
                        completed = true;
                        schedule();
                        flush();
                    }
                },
                e => {
                    if (!isSync && el._inFlight === result) {
                        completed = true;
                        handleError(e);
                    }
                }
            );
            isSync = false;
            if (resolved && !syncResult.done) {
                syncValue = syncResult.value;
                hadSyncValue = true;
                return iterate();
            }
            return resolved && syncResult.done;
        };
        const immediatelyDone = iterate();
        if (!hadSyncValue && !immediatelyDone) {
            globalQueue.initTransition(resolveTransition(el));
            throw new NotReadyError(context);
        }
    }
    return syncValue;
}
function clearStatus(el, clearUninitialized = false) {
    if (el._pendingSource || el._pendingSources) clearPendingSources(el);
    if (el._blocked) el._blocked = false;
    el._statusFlags = clearUninitialized ? 0 : el._statusFlags & STATUS_UNINITIALIZED;
    if (el._error) setPendingError(el);
    if (el._pendingSignal) updatePendingSignal(el);
    if (el._notifyStatus) el._notifyStatus();
}
function notifyStatus(el, status, error, blockStatus, lane) {
    if (
        status === STATUS_ERROR &&
        !(error instanceof StatusError) &&
        !(error instanceof NotReadyError)
    )
        error = new StatusError(el, error);
    const pendingSource =
        status === STATUS_PENDING && error instanceof NotReadyError ? error.source : undefined;
    const isSource = pendingSource === el;
    const isOptimisticBoundary =
        status === STATUS_PENDING && el._overrideValue !== undefined && !isSource;
    const startsBlocking = isOptimisticBoundary && hasActiveOverride(el);
    if (!blockStatus) {
        if (status === STATUS_PENDING && pendingSource) {
            addPendingSource(el, pendingSource);
            el._statusFlags = STATUS_PENDING | (el._statusFlags & STATUS_UNINITIALIZED);
            setPendingError(el, pendingSource, error);
        } else {
            clearPendingSources(el);
            el._statusFlags =
                status | (status !== STATUS_ERROR ? el._statusFlags & STATUS_UNINITIALIZED : 0);
            el._error = error;
        }
        updatePendingSignal(el);
    }
    if (lane && !blockStatus) {
        assignOrMergeLane(el, lane);
    }
    const downstreamBlockStatus = blockStatus || startsBlocking;
    const downstreamLane = blockStatus || isOptimisticBoundary ? undefined : lane;
    if (el._notifyStatus) {
        if (blockStatus && status === STATUS_PENDING) {
            return;
        }
        if (downstreamBlockStatus) {
            el._notifyStatus(status, error);
        } else {
            el._notifyStatus();
        }
        return;
    }
    forEachDependent(el, sub => {
        sub._time = clock;
        if (
            (status === STATUS_PENDING &&
                pendingSource &&
                sub._pendingSource !== pendingSource &&
                !sub._pendingSources?.has(pendingSource)) ||
            (status !== STATUS_PENDING &&
                (sub._error !== error || sub._pendingSource || sub._pendingSources))
        ) {
            if (!downstreamBlockStatus && !sub._transition) queuePendingNode(sub);
            notifyStatus(sub, status, error, downstreamBlockStatus, downstreamLane);
        }
    });
}
let externalSourceConfig = null;
function enableExternalSource(config) {
    const { factory: factory, untrack: untrackFn = fn => fn() } = config;
    if (externalSourceConfig) {
        const { factory: oldFactory, untrack: oldUntrack } = externalSourceConfig;
        externalSourceConfig = {
            factory: (fn, trigger) => {
                const oldSource = oldFactory(fn, trigger);
                const source = factory(x => oldSource.track(x), trigger);
                return {
                    track: x => source.track(x),
                    dispose() {
                        source.dispose();
                        oldSource.dispose();
                    }
                };
            },
            untrack: fn => oldUntrack(() => untrackFn(fn))
        };
    } else {
        externalSourceConfig = { factory: factory, untrack: untrackFn };
    }
}
GlobalQueue._update = recompute;
GlobalQueue._dispose = disposeChildren;
const PRIMITIVE_IN_FORBIDDEN_SCOPE_MESSAGE =
    "[PRIMITIVE_IN_FORBIDDEN_SCOPE] Cannot create reactive primitives inside createTrackedEffect or owner-backed onSettled";
let tracking = false;
let stale = false;
let refreshing = false;
let pendingCheckActive = false;
let foundPending = false;
let latestReadActive = false;
let context = null;
let currentOptimisticLane = null;
let pendingCheckSources = null;
let snapshotCaptureActive = false;
let snapshotSources = null;
function ownerInSnapshotScope(owner) {
    while (owner) {
        if (owner._snapshotScope) return true;
        owner = owner._parent;
    }
    return false;
}
function setSnapshotCapture(active) {
    snapshotCaptureActive = active;
    if (active && !snapshotSources) snapshotSources = new Set();
}
function markSnapshotScope(owner) {
    owner._snapshotScope = true;
}
function releaseSnapshotScope(owner) {
    owner._snapshotScope = false;
    releaseSubtree(owner);
    schedule();
}
function releaseSubtree(owner) {
    let child = owner._firstChild;
    while (child) {
        if (child._snapshotScope) {
            child = child._nextSibling;
            continue;
        }
        if (child._fn) {
            const comp = child;
            comp._config &= ~CONFIG_IN_SNAPSHOT_SCOPE;
            if (comp._flags & REACTIVE_SNAPSHOT_STALE) {
                comp._flags &= ~REACTIVE_SNAPSHOT_STALE;
                comp._flags |= REACTIVE_DIRTY;
                if (dirtyQueue._min > comp._height) dirtyQueue._min = comp._height;
                insertIntoHeap(comp, dirtyQueue);
            }
        }
        releaseSubtree(child);
        child = child._nextSibling;
    }
}
function clearSnapshots() {
    if (snapshotSources) {
        for (const source of snapshotSources) {
            delete source._snapshotValue;
            delete source[STORE_SNAPSHOT_PROPS];
        }
        snapshotSources = null;
    }
    snapshotCaptureActive = false;
}
function recompute(el, create = false) {
    const isEffect = el._type;
    if (!create) {
        if (el._transition && (!isEffect || activeTransition) && activeTransition !== el._transition)
            globalQueue.initTransition(el._transition);
        deleteFromHeap(el, el._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
        el._inFlight = null;
        if (el._transition || isEffect === EFFECT_TRACKED) disposeChildren(el);
        else if (el._firstChild !== null || el._disposal !== null) {
            markDisposal(el);
            el._pendingDisposal = el._disposal;
            el._pendingFirstChild = el._firstChild;
            el._disposal = null;
            el._firstChild = null;
            el._childCount = 0;
            clearSignals(el);
        } else clearSignals(el);
    }
    let isOptimisticDirty = !!(el._flags & REACTIVE_OPTIMISTIC_DIRTY);
    const hasOverride = el._overrideValue !== undefined && el._overrideValue !== NOT_PENDING;
    const wasPending = !!(el._statusFlags & STATUS_PENDING);
    const wasUninitialized = !!(el._statusFlags & STATUS_UNINITIALIZED);
    const oldcontext = context;
    context = el;
    el._depsTail = null;
    el._flags = REACTIVE_RECOMPUTING_DEPS;
    el._time = clock;
    let value = el._pendingValue === NOT_PENDING ? el._value : el._pendingValue;
    let oldHeight = el._height;
    let prevTracking = tracking;
    let prevLane = currentOptimisticLane;
    let prevStrictRead = false;
    {
        prevStrictRead = strictRead;
        strictRead = false;
    }
    tracking = true;
    if (isOptimisticDirty) {
        const lane = resolveLane(el);
        if (lane) currentOptimisticLane = lane;
    } else if (activeTransition && !create && activeTransition._optimisticNodes.length) {
        for (let d = el._deps; d; d = d._nextDep) {
            const dep = d._dep;
            if (dep._flags & REACTIVE_OPTIMISTIC_DIRTY) {
                const depLane = resolveLane(dep);
                if (depLane) {
                    isOptimisticDirty = true;
                    currentOptimisticLane = depLane;
                    el._flags |= REACTIVE_OPTIMISTIC_DIRTY;
                    assignOrMergeLane(el, depLane);
                    break;
                }
            }
        }
    }
    const isStaleEffect = isEffect && isEffect !== EFFECT_USER;
    const prevStale = stale;
    if (isStaleEffect) stale = true;
    try {
        if (!true && el._config & CONFIG_SYNC);
        else {
            const prevInFlight = el._inFlight;
            const fnResult = el._fn(value);
            const isAsyncResult = typeof fnResult === "object" && fnResult !== null;
            const inFlightChanged = el._inFlight !== prevInFlight;
            value = inFlightChanged || !isAsyncResult ? fnResult : handleAsync(el, fnResult);
            if (!inFlightChanged && !isAsyncResult) el._inFlight = null;
        }
        clearStatus(el, create);
        if (el._optimisticLane) {
            const resolvedLane = resolveLane(el);
            if (resolvedLane) {
                resolvedLane._pendingAsync.delete(el);
                updatePendingSignal(resolvedLane._source);
            }
        }
    } catch (e) {
        if (e instanceof NotReadyError && currentOptimisticLane) {
            const lane = findLane(currentOptimisticLane);
            if (lane._source !== el) {
                lane._pendingAsync.add(el);
                el._optimisticLane = lane;
                updatePendingSignal(lane._source);
            }
        }
        if (e instanceof NotReadyError) el._blocked = true;
        notifyStatus(
            el,
            e instanceof NotReadyError ? STATUS_PENDING : STATUS_ERROR,
            e,
            undefined,
            e instanceof NotReadyError ? el._optimisticLane : undefined
        );
    } finally {
        tracking = prevTracking;
        strictRead = prevStrictRead;
        if (isStaleEffect) stale = prevStale;
        el._flags = REACTIVE_NONE | (create ? el._flags & REACTIVE_SNAPSHOT_STALE : 0);
        context = oldcontext;
    }
    if (!el._error) {
        trimStaleDeps(el);
        const compareValue = hasOverride
            ? el._overrideValue
            : el._pendingValue === NOT_PENDING
                ? el._value
                : el._pendingValue;
        const valueChanged =
            (!isEffect && wasUninitialized) || !el._equals || !el._equals(compareValue, value);
        if (isEffect && valueChanged) {
            el._modified = !el._error;
            if (!create) el._queue.enqueue(isEffect, GlobalQueue._runEffect.bind(null, el));
        }
        if (valueChanged) {
            const prevVisible = hasOverride ? el._overrideValue : undefined;
            if (create || (isEffect && activeTransition !== el._transition) || isOptimisticDirty) {
                el._value = value;
                if (hasOverride && isOptimisticDirty) {
                    el._overrideValue = value;
                    el._pendingValue = value;
                }
            } else el._pendingValue = value;
            if (hasOverride && !isOptimisticDirty && wasPending && !el._overrideSinceLane)
                el._overrideValue = value;
            if (!hasOverride || isOptimisticDirty || el._overrideValue !== prevVisible)
                insertSubs(el, isOptimisticDirty || hasOverride);
        } else if (hasOverride) {
            el._pendingValue = value;
        } else if (el._height != oldHeight) {
            for (let s = el._subs; s !== null; s = s._nextSub) {
                insertIntoHeapHeight(s._sub, s._sub._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
            }
        }
    }
    currentOptimisticLane = prevLane;
    const needsPendingCommit =
        el._pendingValue !== NOT_PENDING ||
        el._pendingFirstChild !== null ||
        el._pendingDisposal !== null ||
        !!(el._statusFlags & (STATUS_PENDING | STATUS_UNINITIALIZED));
    needsPendingCommit &&
    (!create || el._statusFlags & STATUS_PENDING) &&
    !el._transition &&
    !(activeTransition && hasOverride) &&
    queuePendingNode(el);
    el._transition &&
    isEffect &&
    activeTransition !== el._transition &&
    runInTransition(el._transition, () => recompute(el));
}
function updateIfNecessary(el) {
    if (el._flags & REACTIVE_CHECK) {
        for (let d = el._deps; d; d = d._nextDep) {
            const dep1 = d._dep;
            const dep = dep1._firewall || dep1;
            if (dep._fn) {
                updateIfNecessary(dep);
            }
            if (el._flags & REACTIVE_DIRTY) {
                break;
            }
        }
    }
    if (
        el._flags & (REACTIVE_DIRTY | REACTIVE_OPTIMISTIC_DIRTY) ||
        (el._error && el._time < clock && !el._inFlight)
    ) {
        recompute(el);
    }
    el._flags = el._flags & (REACTIVE_SNAPSHOT_STALE | REACTIVE_IN_HEAP | REACTIVE_IN_HEAP_HEIGHT);
}
function computed(fn, options) {
    const transparent = options?.transparent ?? false;
    const self = {
        id:
            options?.id ??
            (transparent ? context?.id : context?.id != null ? getNextChildId(context) : undefined),
        _config:
            (transparent ? CONFIG_TRANSPARENT : 0) |
            (options?.ownedWrite ? CONFIG_OWNED_WRITE : 0) |
            (!context || options?.lazy ? CONFIG_AUTO_DISPOSE : 0) |
            (options?.sync ? CONFIG_SYNC : 0) |
            (snapshotCaptureActive && ownerInSnapshotScope(context) ? CONFIG_IN_SNAPSHOT_SCOPE : 0),
        _equals: options?.equals != null ? options.equals : isEqual,
        _unobserved: options?.unobserved,
        _disposal: null,
        _queue: context?._queue ?? globalQueue,
        _context: context?._context ?? defaultContext,
        _childCount: 0,
        _fn: fn,
        _value: undefined,
        _height: 0,
        _child: null,
        _nextHeap: undefined,
        _prevHeap: null,
        _deps: null,
        _depsTail: null,
        _subs: null,
        _subsTail: null,
        _parent: context,
        _nextSibling: null,
        _prevSibling: null,
        _firstChild: null,
        _flags: options?.lazy ? REACTIVE_LAZY : REACTIVE_NONE,
        _statusFlags: STATUS_UNINITIALIZED,
        _time: clock,
        _pendingValue: NOT_PENDING,
        _pendingDisposal: null,
        _pendingFirstChild: null,
        _inFlight: null,
        _transition: null
    };
    self._name = options?.name ?? "computed";
    setupComputedNode(self, options);
    return self;
}
function createEffectNode(fn, effectFn, errorFn, type, notifyStatus, options) {
    const transparent = options?.transparent ?? false;
    const self = {
        id:
            options?.id ??
            (transparent ? context?.id : context?.id != null ? getNextChildId(context) : undefined),
        _config:
            (transparent ? CONFIG_TRANSPARENT : 0) |
            (options?.ownedWrite ? CONFIG_OWNED_WRITE : 0) |
            (options?.sync ? CONFIG_SYNC : 0) |
            (snapshotCaptureActive && ownerInSnapshotScope(context) ? CONFIG_IN_SNAPSHOT_SCOPE : 0),
        _equals: false,
        _unobserved: options?.unobserved,
        _disposal: null,
        _queue: context?._queue ?? globalQueue,
        _context: context?._context ?? defaultContext,
        _childCount: 0,
        _fn: fn,
        _value: undefined,
        _height: 0,
        _child: null,
        _nextHeap: undefined,
        _prevHeap: null,
        _deps: null,
        _depsTail: null,
        _subs: null,
        _subsTail: null,
        _parent: context,
        _nextSibling: null,
        _prevSibling: null,
        _firstChild: null,
        _flags: REACTIVE_LAZY,
        _statusFlags: STATUS_UNINITIALIZED,
        _time: clock,
        _pendingValue: NOT_PENDING,
        _pendingDisposal: null,
        _pendingFirstChild: null,
        _inFlight: null,
        _transition: null,
        _modified: false,
        _prevValue: undefined,
        _effectFn: effectFn,
        _errorFn: errorFn,
        _cleanup: undefined,
        _cleanupRegistered: false,
        _type: type,
        _notifyStatus: notifyStatus
    };
    self._name = options?.name ?? "effect";
    setupComputedNode(self, lazyOptions);
    return self;
}
const lazyOptions = { lazy: true };
function setupComputedNode(self, options) {
    self._prevHeap = self;
    const parent = context?._root ? context._parentComputed : context;
    if (context && context._config & CONFIG_CHILDREN_FORBIDDEN) {
        emitDiagnostic({
            code: "PRIMITIVE_IN_FORBIDDEN_SCOPE",
            kind: "lifecycle",
            severity: "error",
            message: PRIMITIVE_IN_FORBIDDEN_SCOPE_MESSAGE,
            ownerId: context.id,
            ownerName: context._name
        });
        throw new Error(PRIMITIVE_IN_FORBIDDEN_SCOPE_MESSAGE);
    }
    if (context) {
        const lastChild = context._firstChild;
        if (lastChild === null) {
            context._firstChild = self;
        } else {
            self._nextSibling = lastChild;
            lastChild._prevSibling = self;
            context._firstChild = self;
        }
    }
    DEV$1.hooks.onOwner?.(self);
    if (parent) self._height = parent._height + 1;
    if (externalSourceConfig) {
        const bridgeSignal = signal(undefined, { equals: false, ownedWrite: true });
        const source = externalSourceConfig.factory(self._fn, () => {
            setSignal(bridgeSignal, undefined);
        });
        cleanup(() => source.dispose());
        self._fn = prev => {
            read(bridgeSignal);
            return source.track(prev);
        };
    }
    !options?.lazy && recompute(self, true);
    if (snapshotCaptureActive && !options?.lazy) {
        if (!(self._statusFlags & STATUS_PENDING)) {
            self._snapshotValue = self._value === undefined ? NO_SNAPSHOT : self._value;
            snapshotSources.add(self);
        }
    }
}
function signal(v, options, firewall = null) {
    const s = {
        _equals: options?.equals != null ? options.equals : isEqual,
        _config:
            (options?.ownedWrite ? CONFIG_OWNED_WRITE : 0) |
            (options?._noSnapshot ? CONFIG_NO_SNAPSHOT : 0),
        _unobserved: options?.unobserved,
        _value: v,
        _subs: null,
        _subsTail: null,
        _time: clock,
        _firewall: firewall,
        _nextChild: firewall?._child || null,
        _pendingValue: NOT_PENDING
    };
    {
        s._name = options?.name ?? "signal";
        s._internal = !!firewall;
    }
    firewall && (firewall._child = s);
    if (
        snapshotCaptureActive &&
        !(s._config & CONFIG_NO_SNAPSHOT) &&
        !((firewall?._statusFlags ?? 0) & STATUS_PENDING)
    ) {
        s._snapshotValue = v === undefined ? NO_SNAPSHOT : v;
        snapshotSources.add(s);
    }
    return s;
}
function optimisticSignal(v, options) {
    const s = signal(v, options);
    s._overrideValue = NOT_PENDING;
    return s;
}
function optimisticComputed(fn, options) {
    const c = computed(fn, options);
    c._overrideValue = NOT_PENDING;
    return c;
}
function isEqual(a, b) {
    return a === b;
}
let strictRead = false;
function setStrictRead(v) {
    const prev = strictRead;
    strictRead = v;
    return prev;
}
function untrack(fn, strictReadLabel) {
    if (!externalSourceConfig && !tracking && !strictRead && !strictReadLabel) return fn();
    const prevTracking = tracking;
    const prevStrictRead = strictRead;
    tracking = false;
    strictRead = strictReadLabel || false;
    try {
        if (externalSourceConfig) return externalSourceConfig.untrack(fn);
        return fn();
    } finally {
        tracking = prevTracking;
        strictRead = prevStrictRead;
    }
}
function read(el) {
    if (latestReadActive) {
        const pendingComputed = getLatestValueComputed(el);
        const prevPending = latestReadActive;
        latestReadActive = false;
        const visibleValue =
            el._overrideValue !== undefined && el._overrideValue !== NOT_PENDING
                ? el._overrideValue
                : el._value;
        let value;
        try {
            value = read(pendingComputed);
        } catch (e) {
            if (!context && e instanceof NotReadyError) return visibleValue;
            throw e;
        } finally {
            latestReadActive = prevPending;
        }
        if (pendingComputed._statusFlags & STATUS_PENDING) return visibleValue;
        if (stale && currentOptimisticLane && pendingComputed._optimisticLane) {
            const pcLane = findLane(pendingComputed._optimisticLane);
            const curLane = findLane(currentOptimisticLane);
            if (pcLane !== curLane && pcLane._pendingAsync.size > 0) {
                return visibleValue;
            }
        }
        return value;
    }
    if (pendingCheckActive) {
        const firewall = el._firewall;
        const prevCheck = pendingCheckActive;
        pendingCheckActive = false;
        let c = context;
        if (c?._root) c = c._parentComputed;
        const owner = firewall || el;
        const pendingComputed = el;
        if (typeof pendingComputed._fn === "function") {
            const comp = el;
            if (comp._flags & REACTIVE_LAZY) {
                comp._flags &= ~REACTIVE_LAZY;
                recompute(comp, true);
            } else if (comp._flags & REACTIVE_DISPOSED) {
                recompute(comp, true);
            } else {
                updateIfNecessary(comp);
            }
        }
        if (c && owner._statusFlags & STATUS_PENDING && owner._statusFlags & STATUS_UNINITIALIZED) {
            if (tracking && el !== c) link(el, c);
            pendingCheckActive = prevCheck;
            throw owner._error;
        }
        if (firewall && el._overrideValue !== undefined) {
            if (
                el._overrideValue !== NOT_PENDING &&
                (firewall._inFlight || !!(firewall._statusFlags & STATUS_PENDING))
            ) {
                foundPending = true;
            }
            collectPendingSources(el);
            collectPendingSources(firewall);
            if (c && tracking) link(el, c);
        } else {
            collectPendingSources(el);
            if (firewall) collectPendingSources(firewall);
        }
        pendingCheckActive = prevCheck;
    }
    let c = context;
    if (c?._root) c = c._parentComputed;
    const computed = el;
    if (typeof computed._fn === "function") {
        const comp = el;
        if (comp._flags & REACTIVE_LAZY) {
            comp._flags &= ~REACTIVE_LAZY;
            recompute(comp, true);
        } else if (comp._flags & REACTIVE_DISPOSED) {
            recompute(comp, true);
        }
    }
    const owner = el._firewall || el;
    if (
        !computed._fn &&
        owner === el &&
        el._overrideValue === undefined &&
        el._snapshotValue === undefined &&
        activeTransition === null &&
        currentOptimisticLane === null &&
        !snapshotCaptureActive &&
        !strictRead
    ) {
        if (c && tracking) link(el, c);
        return !c || el._pendingValue === NOT_PENDING ? el._value : el._pendingValue;
    }
    if (strictRead && owner._statusFlags & STATUS_PENDING) {
        const message =
            `[PENDING_ASYNC_UNTRACKED_READ] Reading a pending async value directly in ${strictRead}. ` +
            `Async values must be read within a tracking scope (JSX, a memo, or an effect's compute function).`;
        emitDiagnostic({
            code: "PENDING_ASYNC_UNTRACKED_READ",
            kind: "async",
            severity: "error",
            message: message,
            ownerId: c?.id,
            ownerName: c?._name,
            nodeName: owner?._name,
            data: { strictRead: strictRead }
        });
        throw new Error(message);
    }
    if (c && tracking) {
        link(el, c);
        if (owner._fn) {
            const isZombie = el._flags & REACTIVE_ZOMBIE;
            if (owner._height >= (isZombie ? zombieQueue._min : dirtyQueue._min)) {
                markNode(c);
                markHeap(isZombie ? zombieQueue : dirtyQueue);
                updateIfNecessary(owner);
            }
            const height = owner._height;
            if (height >= c._height && el._parent !== c) {
                c._height = height + 1;
            }
        }
    }
    if (owner._statusFlags & STATUS_PENDING) {
        if (c && !(stale && owner._transition && activeTransition !== owner._transition)) {
            if (c && c._config & CONFIG_CHILDREN_FORBIDDEN) {
                const message =
                    "[PENDING_ASYNC_FORBIDDEN_SCOPE] Reading a pending async value inside createTrackedEffect or onSettled will throw. " +
                    "Use createEffect instead which supports async-aware reactivity.";
                emitDiagnostic({
                    code: "PENDING_ASYNC_FORBIDDEN_SCOPE",
                    kind: "async",
                    severity: "warn",
                    message: message,
                    ownerId: c.id,
                    ownerName: c._name,
                    nodeName: owner?._name
                });
                console.warn(message);
            }
            if (currentOptimisticLane) {
                const pendingLane = owner._optimisticLane;
                const lane = findLane(currentOptimisticLane);
                if (pendingLane && findLane(pendingLane) === lane && !hasActiveOverride(owner)) {
                    if (!tracking && el !== c) link(el, c);
                    throw owner._error;
                }
            } else {
                if (!tracking && el !== c) link(el, c);
                throw owner._error;
            }
        } else if (c && owner !== el && owner._statusFlags & STATUS_UNINITIALIZED) {
            if (!tracking && el !== c) link(el, c);
            throw owner._error;
        } else if (!c && owner._statusFlags & STATUS_UNINITIALIZED) {
            throw owner._error;
        }
    }
    if (el._fn && el._statusFlags & STATUS_ERROR) {
        if (el._time < clock) {
            recompute(el);
            return read(el);
        } else throw el._error;
    }
    if (snapshotCaptureActive && c && c._config & CONFIG_IN_SNAPSHOT_SCOPE) {
        const sv = el._snapshotValue;
        if (sv !== undefined) {
            const snapshot = sv === NO_SNAPSHOT ? undefined : sv;
            const current = el._pendingValue !== NOT_PENDING ? el._pendingValue : el._value;
            if (current !== snapshot) c._flags |= REACTIVE_SNAPSHOT_STALE;
            return snapshot;
        }
    }
    if (strictRead) {
        const message =
            `[STRICT_READ_UNTRACKED] Reactive value read directly in ${strictRead} will not update. ` +
            `Move it into a tracking scope (JSX, a memo, or an effect's compute function).`;
        emitDiagnostic({
            code: "STRICT_READ_UNTRACKED",
            kind: "strict-read",
            severity: "warn",
            message: message,
            ownerId: c?.id,
            ownerName: c?._name,
            nodeName: owner?._name,
            data: { strictRead: strictRead }
        });
        console.warn(message);
    }
    if (el._overrideValue !== undefined && el._overrideValue !== NOT_PENDING) {
        if (c && stale && shouldReadStashedOptimisticValue(el)) return el._value;
        return el._overrideValue;
    }
    if (
        activeTransition !== null &&
        currentOptimisticLane !== null &&
        !latestReadActive &&
        el._pendingValue !== NOT_PENDING &&
        owner === el &&
        !el._fn &&
        c
    ) {
        activeTransition._gatedSubs.add(c);
        return el._value;
    }
    const value =
        !c ||
        (currentOptimisticLane !== null &&
            (el._overrideValue !== undefined ||
                el._optimisticLane ||
                (owner === el && stale) ||
                !!(owner._statusFlags & STATUS_PENDING))) ||
        el._pendingValue === NOT_PENDING ||
        (stale && el._transition && activeTransition !== el._transition)
            ? el._value
            : el._pendingValue;
    if (
        !c &&
        owner === el &&
        typeof computed._fn === "function" &&
        el._config & CONFIG_AUTO_DISPOSE &&
        !(owner._statusFlags & STATUS_PENDING) &&
        !el._subs
    ) {
        unobserved(el);
    }
    return value;
}
function setSignal(el, v) {
    if (
        !(el._config & CONFIG_OWNED_WRITE) &&
        !(context && context._config & CONFIG_CHILDREN_FORBIDDEN) &&
        context &&
        el._firewall !== context
    ) {
        const message =
            "[SIGNAL_WRITE_IN_OWNED_SCOPE] Writing to a Signal inside an owned scope (component, computation) is not allowed. " +
            "Move the write outside or set the `ownedWrite` option if this is intentional.";
        emitDiagnostic({
            code: "SIGNAL_WRITE_IN_OWNED_SCOPE",
            kind: "write",
            severity: "error",
            message: message,
            ownerId: context.id,
            ownerName: context._name,
            nodeName: el._name
        });
        throw new Error(message);
    }
    if (el._transition && activeTransition !== el._transition)
        globalQueue.initTransition(el._transition);
    const isOptimistic = el._overrideValue !== undefined && !projectionWriteActive;
    const hasOverride = el._overrideValue !== undefined && el._overrideValue !== NOT_PENDING;
    const currentValue = isOptimistic
        ? hasOverride
            ? el._overrideValue
            : el._value
        : el._pendingValue === NOT_PENDING
            ? el._value
            : el._pendingValue;
    if (typeof v === "function") v = v(currentValue);
    const valueChanged =
        !el._equals || !el._equals(currentValue, v) || !!(el._statusFlags & STATUS_UNINITIALIZED);
    if (!valueChanged) {
        if (isOptimistic && hasOverride && el._fn) {
            insertSubs(el, true);
            schedule();
        }
        return v;
    }
    if (isOptimistic) {
        const firstOverride = el._overrideValue === NOT_PENDING;
        if (!firstOverride) globalQueue.initTransition(resolveTransition(el));
        if (firstOverride) {
            el._pendingValue = el._value;
            globalQueue._optimisticNodes.push(el);
        }
        el._overrideSinceLane = true;
        const lane = getOrCreateLane(el);
        el._optimisticLane = lane;
        el._overrideValue = v;
    } else {
        if (el._pendingValue === NOT_PENDING) queuePendingNode(el);
        el._pendingValue = v;
    }
    if (el._pendingSignal) updatePendingSignal(el);
    if (el._latestValueComputed) {
        setSignal(el._latestValueComputed, v);
    }
    el._time = clock;
    insertSubs(el, isOptimistic);
    schedule();
    return v;
}
function suppressComputedRecompute(el) {
    deleteFromHeap(el, el._flags & REACTIVE_ZOMBIE ? zombieQueue : dirtyQueue);
    if (!(el._flags & REACTIVE_MANUAL_WRITE) && el._pendingValue === NOT_PENDING)
        queuePendingNode(el);
    el._flags = (el._flags & -4) | REACTIVE_MANUAL_WRITE;
}
function setMemo(el, v) {
    const result = setSignal(el, v);
    suppressComputedRecompute(el);
    return result;
}
function runWithOwner(owner, fn) {
    if (owner && owner._flags & REACTIVE_DISPOSED) {
        const message =
            "[RUN_WITH_DISPOSED_OWNER] runWithOwner called with a disposed owner. Children created inside will never be disposed.";
        emitDiagnostic({
            code: "RUN_WITH_DISPOSED_OWNER",
            kind: "owner",
            severity: "warn",
            message: message,
            ownerId: owner.id,
            ownerName: owner._name
        });
        console.warn(message);
    }
    const oldContext = context;
    const prevTracking = tracking;
    context = owner;
    tracking = false;
    try {
        return fn();
    } finally {
        context = oldContext;
        tracking = prevTracking;
    }
}
function getPendingSignal(el) {
    if (!el._pendingSignal) {
        el._pendingSignal = optimisticSignal(false, { ownedWrite: true });
        if (el._parentSource) {
            el._pendingSignal._parentSource = el;
        }
        if (computePendingState(el)) setSignal(el._pendingSignal, true);
    }
    return el._pendingSignal;
}
function collectPendingSources(el) {
    pendingCheckSources?.add(el);
    const owner = el._firewall || el;
    if (owner !== el) pendingCheckSources?.add(owner);
}
function computePendingState(el) {
    const comp = el;
    const firewall = el._firewall;
    if (el._parentSource) {
        const parent = el._parentSource;
        if (parent._statusFlags & STATUS_PENDING && !(parent._statusFlags & STATUS_UNINITIALIZED))
            return true;
        return el._pendingValue !== NOT_PENDING && !(comp._statusFlags & STATUS_UNINITIALIZED);
    }
    if (firewall && el._pendingValue !== NOT_PENDING) {
        return !firewall._inFlight && !(firewall._statusFlags & STATUS_PENDING);
    }
    if (el._overrideValue !== undefined && el._overrideValue !== NOT_PENDING) {
        if (comp._statusFlags & STATUS_PENDING && !(comp._statusFlags & STATUS_UNINITIALIZED))
            return true;
        if (el._parentSource) {
            const lane = el._optimisticLane ? findLane(el._optimisticLane) : null;
            return !!(lane && lane._pendingAsync.size > 0);
        }
        return true;
    }
    if (el._overrideValue !== undefined && el._overrideValue === NOT_PENDING && !el._parentSource) {
        return false;
    }
    if (el._pendingValue !== NOT_PENDING && !(comp._statusFlags & STATUS_UNINITIALIZED)) return true;
    return !!(comp._statusFlags & STATUS_PENDING && !(comp._statusFlags & STATUS_UNINITIALIZED));
}
function updatePendingSignal(el) {
    if (el._pendingSignal) {
        const pending = computePendingState(el);
        const sig = el._pendingSignal;
        setSignal(sig, pending);
        if (!pending && sig._optimisticLane) {
            const sourceLane = resolveLane(el);
            if (sourceLane && sourceLane._pendingAsync.size > 0) {
                const sigLane = findLane(sig._optimisticLane);
                if (sigLane !== sourceLane) {
                    mergeLanes(sourceLane, sigLane);
                }
            }
            signalLanes.delete(sig);
            sig._optimisticLane = undefined;
        }
    }
}
function getLatestValueComputed(el) {
    if (!el._latestValueComputed) {
        const prevPending = latestReadActive;
        latestReadActive = false;
        const prevCheck = pendingCheckActive;
        pendingCheckActive = false;
        const prevContext = context;
        context = null;
        el._latestValueComputed = optimisticComputed(() => read(el));
        el._latestValueComputed._parentSource = el;
        context = prevContext;
        pendingCheckActive = prevCheck;
        latestReadActive = prevPending;
    }
    return el._latestValueComputed;
}
function staleValues(fn, set = true) {
    const prevStale = stale;
    stale = set;
    try {
        return fn();
    } finally {
        stale = prevStale;
    }
}
function latest(fn) {
    const prevLatest = latestReadActive;
    latestReadActive = true;
    try {
        return fn();
    } finally {
        latestReadActive = prevLatest;
    }
}
function isPending(fn) {
    const prevPendingCheck = pendingCheckActive;
    const prevFoundPending = foundPending;
    const prevPendingCheckSources = pendingCheckSources;
    pendingCheckActive = true;
    foundPending = false;
    pendingCheckSources = new Set();
    const collectPending = () => {
        pendingCheckActive = false;
        const prevStrictRead = strictRead;
        strictRead = false;
        try {
            pendingCheckSources.forEach(source => {
                if (read(getPendingSignal(source))) foundPending = true;
            });
        } finally {
            strictRead = prevStrictRead;
            pendingCheckActive = true;
        }
    };
    try {
        fn();
        collectPending();
        return foundPending;
    } catch (e) {
        collectPending();
        if (e instanceof NotReadyError) {
            if (foundPending && !(e.source?._statusFlags & STATUS_UNINITIALIZED)) return true;
            if (context) throw e;
        }
        return foundPending;
    } finally {
        pendingCheckActive = prevPendingCheck;
        foundPending = prevFoundPending;
        pendingCheckSources = prevPendingCheckSources;
    }
}
function refresh(target) {
    let prevRefreshing = refreshing;
    refreshing = true;
    try {
        const node = target?.[$REFRESH];
        if (true && !node) {
            const message =
                "[INVALID_REFRESH_TARGET] refresh() expects a Solid source accessor or refreshable store. " +
                "Pass the original source target, not a wrapper function or derived property read.";
            emitDiagnostic({
                code: "INVALID_REFRESH_TARGET",
                kind: "write",
                severity: "error",
                message: message
            });
            throw new Error(message);
        }
        if (node && typeof node._fn === "function" && !(node._flags & REACTIVE_DISPOSED)) {
            recompute(node);
        }
    } finally {
        refreshing = prevRefreshing;
        if (!prevRefreshing) {
            schedule();
        }
    }
}
function isRefreshing() {
    return refreshing;
}
function createContext(defaultValue, description) {
    return { id: Symbol(description), defaultValue: defaultValue };
}
function getContext(context, owner = getOwner()) {
    if (!owner) {
        throw new NoOwnerError();
    }
    const value = hasContext(context, owner) ? owner._context[context.id] : context.defaultValue;
    if (isUndefined(value)) {
        throw new ContextNotFoundError();
    }
    return value;
}
function setContext(context, value, owner = getOwner()) {
    if (!owner) {
        throw new NoOwnerError();
    }
    owner._context = {
        ...owner._context,
        [context.id]: isUndefined(value) ? context.defaultValue : value
    };
}
function hasContext(context, owner) {
    return !isUndefined(owner?._context[context.id]);
}
function isUndefined(value) {
    return typeof value === "undefined";
}
function effect(compute, effect, error, options) {
    const isUser = !!options?.user;
    const node = createEffectNode(
        compute,
        effect,
        error,
        isUser ? EFFECT_USER : EFFECT_RENDER,
        notifyEffectStatus,
        options
    );
    recompute(node, true);
    !options?.defer &&
    (node._type === EFFECT_USER || options?.schedule
        ? node._queue.enqueue(node._type, runEffect.bind(null, node))
        : runEffect(node));
    if (!node._parent) {
        const message =
            "[NO_OWNER_EFFECT] Effects created outside a reactive context will never be disposed";
        emitDiagnostic({
            code: "NO_OWNER_EFFECT",
            kind: "lifecycle",
            severity: "warn",
            message: message,
            ownerId: node.id,
            ownerName: node._name,
            data: { effectType: "effect" }
        });
        console.warn(message);
    }
}
function notifyEffectStatus(status, error) {
    const actualStatus = status !== undefined ? status : this._statusFlags;
    const actualError = error !== undefined ? error : this._error;
    if (actualStatus & STATUS_ERROR) {
        let err = actualError;
        this._queue.notify(this, STATUS_PENDING, 0);
        if (this._type === EFFECT_USER) {
            try {
                return this._errorFn
                    ? this._errorFn(err, () => {
                        this._cleanup?.();
                        this._cleanup = undefined;
                    })
                    : console.error(err);
            } catch (e) {
                err = e;
            }
        }
        if (!this._queue.notify(this, STATUS_ERROR, STATUS_ERROR)) throw err;
    } else if (this._type === EFFECT_RENDER) {
        this._queue.notify(this, STATUS_PENDING | STATUS_ERROR, actualStatus, actualError);
        if (_hitUnhandledAsync) {
            resetUnhandledAsync();
            if (!this._queue.notify(this, STATUS_ERROR, STATUS_ERROR)) {
                const message =
                    "[ASYNC_OUTSIDE_LOADING_BOUNDARY] An async value was read outside a Loading boundary. The root mount will be deferred until all pending async settles.";
                emitDiagnostic({
                    code: "ASYNC_OUTSIDE_LOADING_BOUNDARY",
                    kind: "async",
                    severity: "warn",
                    message: message,
                    ownerId: this.id,
                    ownerName: this._name
                });
                console.warn(message);
            }
        }
    }
}
function runEffect(node) {
    if (!node._modified || node._flags & REACTIVE_DISPOSED) return;
    let prevStrictRead = false;
    {
        prevStrictRead = setStrictRead("an effect callback");
    }
    node._cleanup?.();
    node._cleanup = undefined;
    try {
        const nextCleanup = node._effectFn(node._value, node._prevValue);
        if (true && nextCleanup !== undefined && typeof nextCleanup !== "function") {
            throw new Error(
                `${node._name || "effect"} callback returned an invalid cleanup value. Return a cleanup function or undefined.`
            );
        }
        node._cleanup = nextCleanup;
        if (node._cleanup && !node._cleanupRegistered) {
            node._cleanupRegistered = true;
            runWithOwner(node._parent, () => cleanup(() => node._cleanup?.()));
        }
    } catch (error) {
        node._error = new StatusError(node, error);
        node._statusFlags |= STATUS_ERROR;
        if (!node._queue.notify(node, STATUS_ERROR, STATUS_ERROR)) throw error;
    } finally {
        setStrictRead(prevStrictRead);
        node._prevValue = node._value;
        node._modified = false;
    }
}
GlobalQueue._runEffect = runEffect;
function trackedEffect(fn, options) {
    const run = () => {
        if (!node._modified || node._flags & REACTIVE_DISPOSED) return;
        setTrackedQueueCallback(true);
        try {
            node._modified = false;
            recompute(node);
        } finally {
            setTrackedQueueCallback(false);
        }
    };
    const node = computed(
        () => {
            node._cleanup?.();
            node._cleanup = undefined;
            const cleanup = staleValues(fn);
            if (cleanup !== undefined && typeof cleanup !== "function") {
                throw new Error(
                    `${node._name || "trackedEffect"} callback returned an invalid cleanup value. Return a cleanup function or undefined.`
                );
            }
            node._cleanup = cleanup;
        },
        { ...options, lazy: true }
    );
    node._cleanup = undefined;
    node._config = (node._config & ~CONFIG_AUTO_DISPOSE) | CONFIG_CHILDREN_FORBIDDEN;
    node._modified = true;
    node._type = EFFECT_TRACKED;
    node._notifyStatus = (status, error) => {
        const actualStatus = status !== undefined ? status : node._statusFlags;
        if (actualStatus & STATUS_ERROR) {
            node._queue.notify(node, STATUS_PENDING, 0);
            const err = error !== undefined ? error : node._error;
            if (!node._queue.notify(node, STATUS_ERROR, STATUS_ERROR)) throw err;
        }
    };
    node._run = run;
    node._queue.enqueue(EFFECT_USER, run);
    cleanup(() => node._cleanup?.());
    if (!node._parent) {
        const message =
            "[NO_OWNER_EFFECT] Effects created outside a reactive context will never be disposed";
        emitDiagnostic({
            code: "NO_OWNER_EFFECT",
            kind: "lifecycle",
            severity: "warn",
            message: message,
            ownerId: node.id,
            ownerName: node._name,
            data: { effectType: "trackedEffect" }
        });
        console.warn(message);
    }
}
function restoreTransition(transition, fn) {
    globalQueue.initTransition(transition);
    const result = fn();
    flush();
    return result;
}
function action(genFn) {
    return (...args) =>
        new Promise((resolve, reject) => {
            const it = genFn(...args);
            globalQueue.initTransition();
            let ctx = activeTransition;
            ctx._actions.push(it);
            const done = (v, e) => {
                ctx = currentTransition(ctx);
                const i = ctx._actions.indexOf(it);
                if (i >= 0) ctx._actions.splice(i, 1);
                setActiveTransition(ctx);
                schedule();
                e ? reject(e) : resolve(v);
            };
            const step = (v, err) => {
                let r;
                try {
                    r = err ? it.throw(v) : it.next(v);
                } catch (e) {
                    return done(undefined, e);
                }
                if (r instanceof Promise)
                    return void r.then(run, e => restoreTransition(ctx, () => step(e, true)));
                run(r);
            };
            const run = r => {
                if (r.done) return done(r.value);
                if (r.value instanceof Promise)
                    return void r.value.then(
                        v => restoreTransition(ctx, () => step(v)),
                        e => restoreTransition(ctx, () => step(e, true))
                    );
                restoreTransition(ctx, () => step(r.value));
            };
            step();
        });
}
function onCleanup(fn) {
    {
        const owner = getOwner();
        if (!owner) {
            const message =
                "[NO_OWNER_CLEANUP] onCleanup called outside a reactive context will never be run";
            emitDiagnostic({
                code: "NO_OWNER_CLEANUP",
                kind: "lifecycle",
                severity: "warn",
                message: message
            });
            console.warn(message);
        } else if (owner._config & CONFIG_CHILDREN_FORBIDDEN) {
            const message =
                "[CLEANUP_IN_FORBIDDEN_SCOPE] Cannot use onCleanup inside createTrackedEffect or onSettled; return a cleanup function instead";
            emitDiagnostic({
                code: "CLEANUP_IN_FORBIDDEN_SCOPE",
                kind: "lifecycle",
                severity: "error",
                message: message,
                ownerId: owner.id,
                ownerName: owner._name
            });
            throw new Error(message);
        }
    }
    return cleanup(fn);
}
function accessor(node) {
    const fn = read.bind(null, node);
    fn[$REFRESH] = node;
    return fn;
}
function createSignal(first, second) {
    if (typeof first === "function") {
        const node = computed(first, second);
        node._config &= ~CONFIG_AUTO_DISPOSE;
        return [accessor(node), setMemo.bind(null, node)];
    }
    const node = signal(first, second);
    registerGraph(node, getOwner());
    return [accessor(node), setSignal.bind(null, node)];
}
function createMemo(compute, options) {
    return accessor(computed(compute, options));
}
function createEffect(compute, effectFn, options) {
    if (effectFn === undefined) {
        const message =
            "[MISSING_EFFECT_FN] createEffect requires both a compute function and an effect function. " +
            "Use `createEffect(() => signal(), value => doWork(value))`. " +
            "If you want a derived value, use `createMemo`. " +
            "If you want a one-shot side effect, just call the function directly.";
        emitDiagnostic({
            code: "MISSING_EFFECT_FN",
            kind: "lifecycle",
            severity: "error",
            message: message
        });
        throw new Error(message);
    }
    effect(compute, effectFn.effect || effectFn, effectFn.error, {
        user: true,
        ...{ ...options, name: options?.name ?? "effect" }
    });
}
function createRenderEffect(compute, effectFn, options) {
    effect(compute, effectFn, undefined, { ...options, name: options?.name ?? "effect" });
}
function createTrackedEffect(compute, options) {
    trackedEffect(compute, { ...options, name: options?.name ?? "trackedEffect" });
}
function createReaction(effectFn, options) {
    let cl = undefined;
    cleanup(() => cl?.());
    const owner = getOwner();
    return tracking => {
        runWithOwner(owner, () => {
            effect(
                () => (tracking(), getOwner()),
                node => {
                    cl?.();
                    const cleanup = (effectFn.effect || effectFn)?.();
                    if (true && cleanup !== undefined && typeof cleanup !== "function") {
                        throw new Error(
                            "Reaction callback returned an invalid cleanup value. Return a cleanup function or undefined."
                        );
                    }
                    cl = cleanup;
                    dispose(node);
                },
                effectFn.error,
                {
                    ...(true ? { ...options, name: options?.name ?? "effect" } : options),
                    user: true,
                    defer: true
                }
            );
        });
    };
}
function resolve(fn) {
    if (getObserver()) {
        throw new Error(
            "Cannot call resolve inside a reactive scope; it only resolves the current value and does not track updates."
        );
    }
    return new Promise((res, rej) => {
        createRoot(dispose => {
            computed(() => {
                try {
                    res(fn());
                } catch (err) {
                    if (err instanceof NotReadyError) throw err;
                    rej(err);
                }
                dispose();
            });
        });
    });
}
function createOptimistic(first, second) {
    if (typeof first === "function") {
        const node = optimisticComputed(first, second);
        node._config &= ~CONFIG_AUTO_DISPOSE;
        return [accessor(node), setSignal.bind(null, node)];
    }
    const node = optimisticSignal(first, second);
    registerGraph(node, getOwner());
    return [accessor(node), setSignal.bind(null, node)];
}
function onSettled(callback) {
    const owner = getOwner();
    owner && !(owner._config & CONFIG_CHILDREN_FORBIDDEN)
        ? createTrackedEffect(() => untrack(callback), { name: "onSettled" })
        : globalQueue.enqueue(EFFECT_USER, () => {
            const cleanup = callback();
            if (cleanup !== undefined && typeof cleanup !== "function") {
                throw new Error(
                    "onSettled callback returned an invalid cleanup value. Return a cleanup function or undefined."
                );
            }
            cleanup?.();
        });
}
function unwrap(value) {
    return value?.[$TARGET]?.[STORE_NODE] ?? value;
}
function getOverrideValue(value, override, key, optOverride) {
    if (optOverride && key in optOverride) return optOverride[key];
    return override && key in override ? override[key] : value[key];
}
function getAllKeys(value, override, next) {
    const keys = getKeys(value, override);
    const nextKeys = Object.keys(next);
    return Array.from(new Set([...keys, ...nextKeys]));
}
function applyState(next, state, keyFn) {
    const target = state?.[$TARGET];
    if (!target) return;
    if (target[STORE_OVERRIDE] || target[STORE_OPTIMISTIC_OVERRIDE]) {
        applyStateSlow(next, target, keyFn);
    } else {
        applyStateFast(next, target, keyFn);
    }
}
function applyStateFast(next, target, keyFn) {
    const previous = target[STORE_VALUE];
    if (next === previous) return;
    (target[STORE_LOOKUP] || storeLookup).set(next, target[$PROXY]);
    target[STORE_VALUE] = next;
    if (Array.isArray(previous)) {
        let changed = false;
        const prevLength = previous.length;
        if (next.length && prevLength && next[0] && keyFn(next[0]) != null) {
            let i, j, start, end, newEnd, item, newIndicesNext, keyVal;
            for (
                start = 0, end = Math.min(prevLength, next.length);
                start < end &&
                ((item = previous[start]) === next[start] ||
                    (item && next[start] && keyFn(item) === keyFn(next[start])));
                start++
            ) {
                applyState(next[start], wrap(item, target), keyFn);
            }
            const temp = new Array(next.length),
                newIndices = new Map();
            for (
                end = prevLength - 1, newEnd = next.length - 1;
                end >= start &&
                newEnd >= start &&
                ((item = previous[end]) === next[newEnd] ||
                    (item && next[newEnd] && keyFn(item) === keyFn(next[newEnd])));
                end--, newEnd--
            ) {
                temp[newEnd] = item;
            }
            if (start > newEnd || start > end) {
                for (j = start; j <= newEnd; j++) {
                    changed = true;
                    target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrap(next[j], target));
                }
                for (; j < next.length; j++) {
                    changed = true;
                    const wrapped = wrap(temp[j], target);
                    target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrapped);
                    applyState(next[j], wrapped, keyFn);
                }
                changed && target[STORE_NODE][$TRACK] && setSignal(target[STORE_NODE][$TRACK], void 0);
                prevLength !== next.length &&
                target[STORE_NODE].length &&
                setSignal(target[STORE_NODE].length, next.length);
                return;
            }
            newIndicesNext = new Array(newEnd + 1);
            for (j = newEnd; j >= start; j--) {
                item = next[j];
                keyVal = item ? keyFn(item) : item;
                i = newIndices.get(keyVal);
                newIndicesNext[j] = i === undefined ? -1 : i;
                newIndices.set(keyVal, j);
            }
            for (i = start; i <= end; i++) {
                item = previous[i];
                keyVal = item ? keyFn(item) : item;
                j = newIndices.get(keyVal);
                if (j !== undefined && j !== -1) {
                    temp[j] = item;
                    j = newIndicesNext[j];
                    newIndices.set(keyVal, j);
                }
            }
            for (j = start; j < next.length; j++) {
                if (j in temp) {
                    const wrapped = wrap(temp[j], target);
                    target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrapped);
                    applyState(next[j], wrapped, keyFn);
                } else target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrap(next[j], target));
            }
            if (start < next.length) changed = true;
        } else if (next.length) {
            for (let i = 0, len = next.length; i < len; i++) {
                const item = previous[i];
                isWrappable(item)
                    ? applyState(next[i], wrap(item, target), keyFn)
                    : target[STORE_NODE][i] && setSignal(target[STORE_NODE][i], next[i]);
            }
        }
        if (prevLength !== next.length) {
            changed = true;
            target[STORE_NODE].length && setSignal(target[STORE_NODE].length, next.length);
        }
        changed && target[STORE_NODE][$TRACK] && setSignal(target[STORE_NODE][$TRACK], void 0);
        return;
    }
    let nodes = target[STORE_NODE];
    if (nodes) {
        const tracked = nodes[$TRACK];
        const keys = tracked ? getAllKeys(previous, undefined, next) : Object.keys(nodes);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            const node = nodes[key];
            const previousValue = unwrap(previous[key]);
            let nextValue = unwrap(next[key]);
            if (previousValue === nextValue) continue;
            if (
                !previousValue ||
                !isWrappable(previousValue) ||
                !isWrappable(nextValue) ||
                (keyFn(previousValue) != null && keyFn(previousValue) !== keyFn(nextValue))
            ) {
                tracked && setSignal(tracked, void 0);
                node && setSignal(node, isWrappable(nextValue) ? wrap(nextValue, target) : nextValue);
            } else applyState(nextValue, wrap(previousValue, target), keyFn);
        }
    }
    if ((nodes = target[STORE_HAS])) {
        const keys = Object.keys(nodes);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            setSignal(nodes[key], key in next);
        }
    }
}
function applyStateSlow(next, target, keyFn) {
    const previous = target[STORE_VALUE];
    const override = target[STORE_OVERRIDE];
    const optOverride = target[STORE_OPTIMISTIC_OVERRIDE];
    let nodes = target[STORE_NODE];
    (target[STORE_LOOKUP] || storeLookup).set(next, target[$PROXY]);
    target[STORE_VALUE] = next;
    target[STORE_OVERRIDE] = undefined;
    if (Array.isArray(previous)) {
        let changed = false;
        const prevLength = getOverrideValue(previous, override, "length", optOverride);
        if (next.length && prevLength && next[0] && keyFn(next[0]) != null) {
            let i, j, start, end, newEnd, item, newIndicesNext, keyVal;
            for (
                start = 0, end = Math.min(prevLength, next.length);
                start < end &&
                ((item = getOverrideValue(previous, override, start, optOverride)) === next[start] ||
                    (item && next[start] && keyFn(item) === keyFn(next[start])));
                start++
            ) {
                applyState(next[start], wrap(item, target), keyFn);
            }
            const temp = new Array(next.length),
                newIndices = new Map();
            for (
                end = prevLength - 1, newEnd = next.length - 1;
                end >= start &&
                newEnd >= start &&
                ((item = getOverrideValue(previous, override, end, optOverride)) === next[newEnd] ||
                    (item && next[newEnd] && keyFn(item) === keyFn(next[newEnd])));
                end--, newEnd--
            ) {
                temp[newEnd] = item;
            }
            if (start > newEnd || start > end) {
                for (j = start; j <= newEnd; j++) {
                    changed = true;
                    target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrap(next[j], target));
                }
                for (; j < next.length; j++) {
                    changed = true;
                    const wrapped = wrap(temp[j], target);
                    target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrapped);
                    applyState(next[j], wrapped, keyFn);
                }
                changed && target[STORE_NODE][$TRACK] && setSignal(target[STORE_NODE][$TRACK], void 0);
                prevLength !== next.length &&
                target[STORE_NODE].length &&
                setSignal(target[STORE_NODE].length, next.length);
                return;
            }
            newIndicesNext = new Array(newEnd + 1);
            for (j = newEnd; j >= start; j--) {
                item = next[j];
                keyVal = item ? keyFn(item) : item;
                i = newIndices.get(keyVal);
                newIndicesNext[j] = i === undefined ? -1 : i;
                newIndices.set(keyVal, j);
            }
            for (i = start; i <= end; i++) {
                item = getOverrideValue(previous, override, i, optOverride);
                keyVal = item ? keyFn(item) : item;
                j = newIndices.get(keyVal);
                if (j !== undefined && j !== -1) {
                    temp[j] = item;
                    j = newIndicesNext[j];
                    newIndices.set(keyVal, j);
                }
            }
            for (j = start; j < next.length; j++) {
                if (j in temp) {
                    const wrapped = wrap(temp[j], target);
                    target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrapped);
                    applyState(next[j], wrapped, keyFn);
                } else target[STORE_NODE][j] && setSignal(target[STORE_NODE][j], wrap(next[j], target));
            }
            if (start < next.length) changed = true;
        } else if (next.length) {
            for (let i = 0, len = next.length; i < len; i++) {
                const item = getOverrideValue(previous, override, i, optOverride);
                isWrappable(item)
                    ? applyState(next[i], wrap(item, target), keyFn)
                    : target[STORE_NODE][i] && setSignal(target[STORE_NODE][i], next[i]);
            }
        }
        if (prevLength !== next.length) {
            changed = true;
            target[STORE_NODE].length && setSignal(target[STORE_NODE].length, next.length);
        }
        changed && target[STORE_NODE][$TRACK] && setSignal(target[STORE_NODE][$TRACK], void 0);
        return;
    }
    if (nodes) {
        const tracked = nodes[$TRACK];
        const keys = tracked ? getAllKeys(previous, override, next) : Object.keys(nodes);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            const node = nodes[key];
            const previousValue = unwrap(getOverrideValue(previous, override, key, optOverride));
            let nextValue = unwrap(next[key]);
            if (previousValue === nextValue) continue;
            if (
                !previousValue ||
                !isWrappable(previousValue) ||
                !isWrappable(nextValue) ||
                (keyFn(previousValue) != null && keyFn(previousValue) !== keyFn(nextValue))
            ) {
                tracked && setSignal(tracked, void 0);
                node && setSignal(node, isWrappable(nextValue) ? wrap(nextValue, target) : nextValue);
            } else applyState(nextValue, wrap(previousValue, target), keyFn);
        }
    }
    if ((nodes = target[STORE_HAS])) {
        const keys = Object.keys(nodes);
        for (let i = 0, len = keys.length; i < len; i++) {
            const key = keys[i];
            setSignal(nodes[key], key in next);
        }
    }
}
function reconcile(value, key) {
    return state => {
        if (state == null) throw new Error("Cannot reconcile null or undefined state");
        const keyFn = typeof key === "string" ? item => item[key] : key;
        const eq = keyFn(state);
        if (eq !== undefined && keyFn(value) !== keyFn(state))
            throw new Error("Cannot reconcile states with different identity");
        applyState(value, state, keyFn);
    };
}
function createProjectionInternal(fn, seed, options) {
    let node;
    const wrappedMap = new WeakMap();
    const wrapper = s => {
        s[STORE_WRAP] = wrapProjection;
        s[STORE_LOOKUP] = wrappedMap;
        Object.defineProperty(s, STORE_FIREWALL, {
            get() {
                return node;
            },
            configurable: true
        });
    };
    const wrapProjection = source => {
        if (wrappedMap.has(source)) return wrappedMap.get(source);
        if (source[$TARGET]?.[STORE_WRAP] === wrapProjection) return source;
        const wrapped = createStoreProxy(source, storeTraps, wrapper);
        wrappedMap.set(source, wrapped);
        return wrapped;
    };
    const wrappedStore = wrapProjection(seed);
    node = computed(
        () => {
            if (!node) node = getOwner();
            runProjectionComputed(wrappedStore, fn, options?.key || "id");
        },
        options?.name ? { name: options.name } : undefined
    );
    node._config &= ~CONFIG_AUTO_DISPOSE;
    return { store: wrappedStore, node: node };
}
function createProjection(fn, seed, options) {
    return createProjectionInternal(fn, seed, options).store;
}
function runProjectionComputed(wrappedStore, fn, key, wrapCommit) {
    const owner = getOwner();
    let settled = false;
    let result;
    const draft = new Proxy(
        wrappedStore,
        createWriteTraps(() => !settled || owner._inFlight === result)
    );
    storeSetter(draft, s => {
        result = fn(s);
        settled = true;
        const commit = v => {
            if (v === s || v === undefined) return;
            const write = () => storeSetter(wrappedStore, reconcile(v, key));
            wrapCommit ? wrapCommit(write) : write();
        };
        commit(handleAsync(owner, result, commit));
    });
    return owner;
}
function createWriteTraps(isActive) {
    const traps = {
        get(_, prop) {
            let value;
            setWriteOverride(true);
            setProjectionWriteActive(true);
            try {
                value = _[prop];
            } finally {
                setWriteOverride(false);
                setProjectionWriteActive(false);
            }
            return typeof value === "object" && value !== null ? new Proxy(value, traps) : value;
        },
        has(_, prop) {
            let value;
            setWriteOverride(true);
            setProjectionWriteActive(true);
            try {
                value = prop in _;
            } finally {
                setWriteOverride(false);
                setProjectionWriteActive(false);
            }
            return value;
        },
        set(_, prop, value) {
            if (isActive && !isActive()) return true;
            setWriteOverride(true);
            setProjectionWriteActive(true);
            try {
                _[prop] = value;
            } finally {
                setWriteOverride(false);
                setProjectionWriteActive(false);
            }
            return true;
        },
        deleteProperty(_, prop) {
            if (isActive && !isActive()) return true;
            setWriteOverride(true);
            setProjectionWriteActive(true);
            try {
                delete _[prop];
            } finally {
                setWriteOverride(false);
                setProjectionWriteActive(false);
            }
            return true;
        }
    };
    return traps;
}
const $TRACK = Symbol("STORE_TRACK"),
    $TARGET = Symbol("STORE_TARGET"),
    $PROXY = Symbol("STORE_PROXY"),
    $DELETED = Symbol("STORE_DELETED");
const STORE_VALUE = "v",
    STORE_OVERRIDE = "o",
    STORE_OPTIMISTIC_OVERRIDE = "x",
    STORE_NODE = "n",
    STORE_HAS = "h",
    STORE_CUSTOM_PROTO = "c",
    STORE_WRAP = "w",
    STORE_LOOKUP = "l",
    STORE_FIREWALL = "f",
    STORE_OPTIMISTIC = "p";
function createStoreProxy(value, traps = storeTraps, extend) {
    let newTarget;
    if (Array.isArray(value)) {
        newTarget = [];
        newTarget.v = value;
    } else {
        newTarget = { v: value };
        const unwrapped = value?.[$TARGET]?.[STORE_VALUE] ?? value;
        const proto = Object.getPrototypeOf(unwrapped);
        if (proto !== null && proto !== Object.prototype) {
            newTarget[STORE_CUSTOM_PROTO] = true;
        }
    }
    extend && extend(newTarget);
    return (newTarget[$PROXY] = new Proxy(newTarget, traps));
}
const storeLookup = new WeakMap();
function wrap(value, target) {
    if (target?.[STORE_WRAP]) return target[STORE_WRAP](value, target);
    let p = value[$PROXY] || storeLookup.get(value);
    if (!p) storeLookup.set(value, (p = createStoreProxy(value)));
    return p;
}
function isWrappable(obj) {
    if (obj == null || typeof obj !== "object" || Object.isFrozen(obj)) return false;
    return typeof Node === "undefined" || !(obj instanceof Node);
}
let writeOverride = false;
function setWriteOverride(value) {
    writeOverride = value;
}
function writeOnly(proxy) {
    return writeOverride || !!Writing?.has(proxy);
}
function unwrapStoreValue(value) {
    return value?.[$TARGET]?.[STORE_VALUE] ?? value;
}
function isPrototypePollutionKey$1(property) {
    return property === "__proto__" || property === "constructor" || property === "prototype";
}
function hasOwnStoreProperty(target, property) {
    const optimisticOverride = target[STORE_OPTIMISTIC_OVERRIDE];
    if (
        optimisticOverride &&
        Object.prototype.hasOwnProperty.call(optimisticOverride, property) &&
        optimisticOverride[property] !== $DELETED
    )
        return true;
    const override = target[STORE_OVERRIDE];
    if (
        override &&
        Object.prototype.hasOwnProperty.call(override, property) &&
        override[property] !== $DELETED
    )
        return true;
    return Object.prototype.hasOwnProperty.call(unwrapStoreValue(target[STORE_VALUE]), property);
}
function hasInheritedAccessor(source, property) {
    let current = Object.getPrototypeOf(source);
    while (current && current !== Object.prototype) {
        const desc = Reflect.getOwnPropertyDescriptor(current, property);
        if (desc) return !!desc.get;
        current = Object.getPrototypeOf(current);
    }
    return false;
}
function getNodes(target, type) {
    let nodes = target[type];
    if (!nodes) target[type] = nodes = Object.create(null);
    return nodes;
}
function getNode(nodes, property, value, firewall, equals = isEqual, optimistic, snapshotProps) {
    if (nodes[property]) return nodes[property];
    const s = signal(
        value,
        {
            equals: equals,
            unobserved() {
                if (nodes[property] === s) delete nodes[property];
            }
        },
        firewall
    );
    if (optimistic) {
        s._overrideValue = NOT_PENDING;
    }
    if (snapshotProps && property in snapshotProps) {
        const sv = snapshotProps[property];
        s._snapshotValue = sv === undefined ? NO_SNAPSHOT : sv;
        snapshotSources?.add(s);
    }
    return (nodes[property] = s);
}
function trackSelf(target, symbol = $TRACK) {
    getObserver() &&
    read(
        getNode(
            getNodes(target, STORE_NODE),
            symbol,
            undefined,
            target[STORE_FIREWALL],
            false,
            target[STORE_OPTIMISTIC]
        )
    );
}
function getKeys(source, override, enumerable = true) {
    const baseKeys = untrack(() => (enumerable ? Object.keys(source) : Reflect.ownKeys(source)));
    if (!override) return baseKeys;
    const keys = new Set(baseKeys);
    const overrides = Reflect.ownKeys(override);
    for (const key of overrides) {
        if (override[key] !== $DELETED) keys.add(key);
        else keys.delete(key);
    }
    return Array.from(keys);
}
function getPropertyDescriptor(source, override, property) {
    if (override && property in override) {
        if (override[property] === $DELETED) return void 0;
        const overrideDesc = Reflect.getOwnPropertyDescriptor(override, property);
        if (overrideDesc?.get || overrideDesc?.set || !(property in source)) return overrideDesc;
    }
    return Reflect.getOwnPropertyDescriptor(source, property);
}
function prepareStoreWrite(target, store, property) {
    if (target[STORE_OPTIMISTIC]) {
        const firewall = target[STORE_FIREWALL];
        if (firewall?._transition) {
            globalQueue.initTransition(firewall._transition);
        }
    }
    const state = target[STORE_VALUE];
    const base = state[property];
    if (
        snapshotCaptureActive &&
        typeof property !== "symbol" &&
        !((target[STORE_FIREWALL]?._statusFlags ?? 0) & STATUS_PENDING)
    ) {
        if (!target[STORE_SNAPSHOT_PROPS]) {
            target[STORE_SNAPSHOT_PROPS] = Object.create(null);
            snapshotSources?.add(target);
        }
        if (!(property in target[STORE_SNAPSHOT_PROPS])) {
            target[STORE_SNAPSHOT_PROPS][property] = base;
        }
    }
    const useOptimistic = target[STORE_OPTIMISTIC] && !projectionWriteActive;
    const overrideKey = useOptimistic ? STORE_OPTIMISTIC_OVERRIDE : STORE_OVERRIDE;
    if (useOptimistic) trackOptimisticStore(store);
    return { base: base, overrideKey: overrideKey, state: state };
}
function upsertStoreNode(target, nodes, property, prev, snapshotProps) {
    if (nodes[property]) return nodes[property];
    const initial = isWrappable(prev) ? wrap(prev, target) : prev;
    const node = getNode(
        nodes,
        property,
        initial,
        target[STORE_FIREWALL],
        isEqual,
        target[STORE_OPTIMISTIC],
        snapshotProps
    );
    registerTransientStoreNode(node);
    return node;
}
function notifyStoreProperty(target, property, mode, value, prev, prevHas) {
    const skipUpsert = projectionWriteActive || target[STORE_OPTIMISTIC];
    const newHas = mode !== "delete";
    const existingHas = target[STORE_HAS]?.[property];
    if (existingHas) {
        setSignal(existingHas, newHas);
    } else if (!skipUpsert && mode !== "invalidate" && prevHas !== newHas) {
        const hasNode = upsertStoreNode(target, getNodes(target, STORE_HAS), property, prevHas);
        setSignal(hasNode, newHas);
    }
    const nodes = getNodes(target, STORE_NODE);
    if (mode === "set") {
        if (nodes[property]) {
            setSignal(nodes[property], () => (isWrappable(value) ? wrap(value, target) : value));
        } else if (!skipUpsert) {
            const node = upsertStoreNode(target, nodes, property, prev, target[STORE_SNAPSHOT_PROPS]);
            setSignal(node, () => (isWrappable(value) ? wrap(value, target) : value));
        }
    } else if (mode === "invalidate") {
        if (nodes[property]) {
            setSignal(nodes[property], {});
            delete nodes[property];
        }
    } else {
        if (nodes[property]) {
            setSignal(nodes[property], undefined);
        } else if (!skipUpsert) {
            const node = upsertStoreNode(target, nodes, property, prev, target[STORE_SNAPSHOT_PROPS]);
            setSignal(node, undefined);
        }
    }
    nodes[$TRACK] && setSignal(nodes[$TRACK], undefined);
}
let Writing = null;
const storeTraps = {
    get(target, property, receiver) {
        if (property === $TARGET) return target;
        if (property === $PROXY) return receiver;
        if (property === $REFRESH) return target[STORE_FIREWALL];
        if (property === $TRACK) {
            trackSelf(target);
            return receiver;
        }
        const nodes = getNodes(target, STORE_NODE);
        const tracked = nodes[property];
        const source = target[STORE_VALUE];
        if (
            !tracked &&
            !target[STORE_OVERRIDE] &&
            !target[STORE_OPTIMISTIC_OVERRIDE] &&
            !target[STORE_CUSTOM_PROTO] &&
            !target[STORE_OPTIMISTIC] &&
            !target[STORE_SNAPSHOT_PROPS] &&
            !source[$TARGET] &&
            !(property in source) &&
            getObserver() &&
            !writeOnly(receiver)
        ) {
            return read(getNode(nodes, property, undefined, target[STORE_FIREWALL]));
        }
        const optOverridden =
            target[STORE_OPTIMISTIC_OVERRIDE] && property in target[STORE_OPTIMISTIC_OVERRIDE];
        const overridden =
            optOverridden || (target[STORE_OVERRIDE] && property in target[STORE_OVERRIDE]);
        const proxySource = !!target[STORE_VALUE][$TARGET];
        const storeValue = optOverridden
            ? target[STORE_OPTIMISTIC_OVERRIDE]
            : target[STORE_OVERRIDE] && property in target[STORE_OVERRIDE]
                ? target[STORE_OVERRIDE]
                : target[STORE_VALUE];
        if (!tracked) {
            const desc = Object.getOwnPropertyDescriptor(storeValue, property);
            if (desc && desc.get) return desc.get.call(receiver);
            if (!desc && !overridden && target[STORE_CUSTOM_PROTO]) {
                const source = unwrapStoreValue(storeValue);
                if (hasInheritedAccessor(source, property)) {
                    return Reflect.get(storeValue, property, receiver);
                }
            }
        }
        if (writeOnly(receiver)) {
            if (isPrototypePollutionKey$1(property) && !hasOwnStoreProperty(target, property))
                return undefined;
            let value =
                tracked && (overridden || !proxySource)
                    ? tracked._overrideValue !== undefined && tracked._overrideValue !== NOT_PENDING
                        ? tracked._overrideValue
                        : tracked._pendingValue !== NOT_PENDING
                            ? tracked._pendingValue
                            : tracked._value
                    : storeValue[property];
            value === $DELETED && (value = undefined);
            if (!isWrappable(value)) return value;
            const wrapped = wrap(value, target);
            Writing?.add(wrapped);
            return wrapped;
        }
        let value = tracked
            ? overridden || !proxySource
                ? read(nodes[property])
                : (read(nodes[property]), storeValue[property])
            : storeValue[property];
        value === $DELETED && (value = undefined);
        if (!tracked) {
            if (!overridden && typeof value === "function" && !storeValue.hasOwnProperty(property)) {
                let proto;
                return !Array.isArray(target[STORE_VALUE]) &&
                (proto = Object.getPrototypeOf(target[STORE_VALUE])) &&
                proto !== Object.prototype
                    ? value.bind(storeValue)
                    : value;
            } else if (getObserver()) {
                return read(
                    getNode(
                        nodes,
                        property,
                        isWrappable(value) ? wrap(value, target) : value,
                        target[STORE_FIREWALL],
                        isEqual,
                        target[STORE_OPTIMISTIC],
                        target[STORE_SNAPSHOT_PROPS]
                    )
                );
            }
        }
        if (strictRead && typeof property === "string") {
            const message =
                `[STRICT_READ_UNTRACKED] Reactive value read directly in ${strictRead} will not update. ` +
                `Move it into a tracking scope (JSX, a memo, or an effect's compute function).`;
            emitDiagnostic({
                code: "STRICT_READ_UNTRACKED",
                kind: "strict-read",
                severity: "warn",
                message: message,
                nodeName: String(property),
                data: { strictRead: strictRead, property: String(property), source: "store" }
            });
            console.warn(message);
        }
        return isWrappable(value) ? wrap(value, target) : value;
    },
    has(target, property) {
        if (property === $PROXY || property === $TRACK || property === "__proto__") return true;
        const has =
            target[STORE_OPTIMISTIC_OVERRIDE] && property in target[STORE_OPTIMISTIC_OVERRIDE]
                ? target[STORE_OPTIMISTIC_OVERRIDE][property] !== $DELETED
                : target[STORE_OVERRIDE] && property in target[STORE_OVERRIDE]
                    ? target[STORE_OVERRIDE][property] !== $DELETED
                    : property in target[STORE_VALUE];
        if (writeOnly(target[$PROXY])) return has;
        const nodes = getNodes(target, STORE_HAS);
        if (nodes[property]) return read(nodes[property]);
        if (getObserver()) {
            return read(
                getNode(nodes, property, has, target[STORE_FIREWALL], isEqual, target[STORE_OPTIMISTIC])
            );
        }
        return has;
    },
    set(target, property, rawValue) {
        if (property === "__proto__") return true;
        const store = target[$PROXY];
        if (writeOnly(store)) {
            untrack(() => {
                const {
                    base: base,
                    overrideKey: overrideKey,
                    state: state
                } = prepareStoreWrite(target, store, property);
                const prev =
                    target[STORE_OPTIMISTIC_OVERRIDE] && property in target[STORE_OPTIMISTIC_OVERRIDE]
                        ? target[STORE_OPTIMISTIC_OVERRIDE][property]
                        : target[STORE_OVERRIDE] && property in target[STORE_OVERRIDE]
                            ? target[STORE_OVERRIDE][property]
                            : base;
                const prevHas =
                    target[STORE_OPTIMISTIC_OVERRIDE] && property in target[STORE_OPTIMISTIC_OVERRIDE]
                        ? target[STORE_OPTIMISTIC_OVERRIDE][property] !== $DELETED
                        : target[STORE_OVERRIDE] && property in target[STORE_OVERRIDE]
                            ? target[STORE_OVERRIDE][property] !== $DELETED
                            : property in target[STORE_VALUE];
                const value = unwrapStoreValue(rawValue);
                const isArrayIndexWrite = Array.isArray(state) && property !== "length";
                const nextIndex = isArrayIndexWrite ? parseInt(property) + 1 : 0;
                const len =
                    isArrayIndexWrite &&
                    (target[STORE_OPTIMISTIC_OVERRIDE] && "length" in target[STORE_OPTIMISTIC_OVERRIDE]
                        ? target[STORE_OPTIMISTIC_OVERRIDE].length
                        : target[STORE_OVERRIDE] && "length" in target[STORE_OVERRIDE]
                            ? target[STORE_OVERRIDE].length
                            : state.length);
                const nextLength = isArrayIndexWrite && nextIndex > len ? nextIndex : undefined;
                if (prev === value && nextLength === undefined) return true;
                if (value !== undefined && value === base && nextLength === undefined)
                    delete target[overrideKey]?.[property];
                else {
                    const override = target[overrideKey] || (target[overrideKey] = Object.create(null));
                    override[property] = value;
                    if (nextLength !== undefined) override.length = nextLength;
                }
                notifyStoreProperty(target, property, "set", value, prev, prevHas);
                if (Array.isArray(state) && property !== "length" && nextLength !== undefined) {
                    const nodes = getNodes(target, STORE_NODE);
                    if (nodes.length) {
                        setSignal(nodes.length, nextLength);
                    } else if (!projectionWriteActive && !target[STORE_OPTIMISTIC]) {
                        const node = upsertStoreNode(
                            target,
                            nodes,
                            "length",
                            len,
                            target[STORE_SNAPSHOT_PROPS]
                        );
                        setSignal(node, nextLength);
                    }
                }
                if (true) DEV$1.hooks.onStoreNodeUpdate?.(target[$PROXY], property, value, prev);
            });
        }
        return true;
    },
    defineProperty(target, property, descriptor) {
        if (property === "__proto__") return true;
        const store = target[$PROXY];
        if (writeOnly(store)) {
            untrack(() => {
                const { base: base, overrideKey: overrideKey } = prepareStoreWrite(target, store, property);
                const normalizedDescriptor =
                    "value" in descriptor
                        ? { ...descriptor, value: unwrapStoreValue(descriptor.value) }
                        : descriptor;
                Object.defineProperty(
                    target[overrideKey] || (target[overrideKey] = Object.create(null)),
                    property,
                    normalizedDescriptor
                );
                notifyStoreProperty(target, property, "invalidate");
                if (true) {
                    const next =
                        "value" in normalizedDescriptor
                            ? normalizedDescriptor.value
                            : normalizedDescriptor.get?.call(store);
                    DEV$1.hooks.onStoreNodeUpdate?.(target[$PROXY], property, next, base);
                }
            });
        }
        return true;
    },
    deleteProperty(target, property) {
        if (property === "__proto__") return true;
        const optDeleted = target[STORE_OPTIMISTIC_OVERRIDE]?.[property] === $DELETED;
        const regDeleted = target[STORE_OVERRIDE]?.[property] === $DELETED;
        if (writeOnly(target[$PROXY]) && !optDeleted && !regDeleted) {
            untrack(() => {
                const useOptimistic = target[STORE_OPTIMISTIC] && !projectionWriteActive;
                const overrideKey = useOptimistic ? STORE_OPTIMISTIC_OVERRIDE : STORE_OVERRIDE;
                if (useOptimistic) trackOptimisticStore(target[$PROXY]);
                const prev =
                    target[STORE_OPTIMISTIC_OVERRIDE] && property in target[STORE_OPTIMISTIC_OVERRIDE]
                        ? target[STORE_OPTIMISTIC_OVERRIDE][property]
                        : target[STORE_OVERRIDE] && property in target[STORE_OVERRIDE]
                            ? target[STORE_OVERRIDE][property]
                            : target[STORE_VALUE][property];
                if (
                    property in target[STORE_VALUE] ||
                    (target[STORE_OVERRIDE] && property in target[STORE_OVERRIDE])
                ) {
                    (target[overrideKey] || (target[overrideKey] = Object.create(null)))[property] = $DELETED;
                } else if (target[overrideKey] && property in target[overrideKey]) {
                    delete target[overrideKey][property];
                } else return true;
                notifyStoreProperty(target, property, "delete", undefined, prev, true);
            });
        }
        return true;
    },
    ownKeys(target) {
        trackSelf(target);
        let keys = getKeys(target[STORE_VALUE], target[STORE_OVERRIDE], false);
        if (target[STORE_OPTIMISTIC_OVERRIDE]) {
            const keySet = new Set(keys);
            for (const key of Reflect.ownKeys(target[STORE_OPTIMISTIC_OVERRIDE])) {
                if (target[STORE_OPTIMISTIC_OVERRIDE][key] !== $DELETED) keySet.add(key);
                else keySet.delete(key);
            }
            keys = Array.from(keySet);
        }
        return keys;
    },
    getOwnPropertyDescriptor(target, property) {
        if (property === $PROXY) return { value: target[$PROXY], writable: true, configurable: true };
        if (target[STORE_OPTIMISTIC_OVERRIDE] && property in target[STORE_OPTIMISTIC_OVERRIDE]) {
            if (target[STORE_OPTIMISTIC_OVERRIDE][property] === $DELETED) return undefined;
            const optDesc = Reflect.getOwnPropertyDescriptor(target[STORE_OPTIMISTIC_OVERRIDE], property);
            if (optDesc?.get || optDesc?.set || !(property in target[STORE_VALUE])) return optDesc;
            const baseDesc = getPropertyDescriptor(target[STORE_VALUE], target[STORE_OVERRIDE], property);
            if (baseDesc) {
                return { ...baseDesc, value: target[STORE_OPTIMISTIC_OVERRIDE][property] };
            }
            return {
                value: target[STORE_OPTIMISTIC_OVERRIDE][property],
                writable: true,
                enumerable: true,
                configurable: true
            };
        }
        return getPropertyDescriptor(target[STORE_VALUE], target[STORE_OVERRIDE], property);
    },
    getPrototypeOf(target) {
        return Object.getPrototypeOf(target[STORE_VALUE]);
    }
};
function storeSetter(store, fn) {
    const prevWriting = Writing;
    Writing = new Set();
    Writing.add(store);
    try {
        const value = fn(store);
        if (value !== store && value !== undefined) {
            if (Array.isArray(value)) {
                for (let i = 0, len = value.length; i < len; i++) store[i] = value[i];
                store.length = value.length;
            } else {
                const keys = new Set([...Object.keys(store), ...Object.keys(value)]);
                keys.forEach(key => {
                    if (key in value) store[key] = value[key];
                    else delete store[key];
                });
            }
        }
    } finally {
        Writing.clear();
        Writing = prevWriting;
    }
}
function createStore(first, second, options) {
    const derived = typeof first === "function",
        wrappedStore = derived ? createProjectionInternal(first, second, options).store : wrap(first);
    registerGraph(wrappedStore, getOwner());
    return [
        wrappedStore,
        derived
            ? fn => (storeSetter(wrappedStore, fn), suppressComputedRecompute(wrappedStore[$REFRESH]))
            : fn => storeSetter(wrappedStore, fn)
    ];
}
function createOptimisticStore(first, second, options) {
    GlobalQueue._clearOptimisticStore ||= clearOptimisticStore;
    const derived = typeof first === "function";
    const initialValue = derived ? second : first;
    const fn = derived ? first : undefined;
    const { store: wrappedStore } = createOptimisticProjectionInternal(fn, initialValue, options);
    return [wrappedStore, fn => storeSetter(wrappedStore, fn)];
}
function clearOptimisticStore(store) {
    const target = store[$TARGET];
    if (!target || !target[STORE_OPTIMISTIC_OVERRIDE]) return;
    const override = target[STORE_OPTIMISTIC_OVERRIDE];
    const nodes = target[STORE_NODE];
    setProjectionWriteActive(true);
    try {
        if (nodes) {
            for (const key of Reflect.ownKeys(override)) {
                if (nodes[key]) {
                    nodes[key]._optimisticLane = undefined;
                    const baseValue =
                        target[STORE_OVERRIDE] && key in target[STORE_OVERRIDE]
                            ? target[STORE_OVERRIDE][key]
                            : target[STORE_VALUE][key];
                    const value = baseValue === $DELETED ? undefined : baseValue;
                    setSignal(nodes[key], isWrappable(value) ? wrap(value, target) : value);
                }
            }
            if (nodes[$TRACK]) {
                nodes[$TRACK]._optimisticLane = undefined;
                setSignal(nodes[$TRACK], undefined);
            }
        }
    } finally {
        setProjectionWriteActive(false);
    }
    delete target[STORE_OPTIMISTIC_OVERRIDE];
}
function createOptimisticProjectionInternal(fn, initialValue, options) {
    let node;
    const wrappedMap = new WeakMap();
    const wrapper = s => {
        s[STORE_WRAP] = wrapProjection;
        s[STORE_LOOKUP] = wrappedMap;
        s[STORE_OPTIMISTIC] = true;
        Object.defineProperty(s, STORE_FIREWALL, {
            get() {
                return node;
            },
            configurable: true
        });
    };
    const wrapProjection = source => {
        if (wrappedMap.has(source)) return wrappedMap.get(source);
        if (source[$TARGET]?.[STORE_WRAP] === wrapProjection) return source;
        const wrapped = createStoreProxy(source, storeTraps, wrapper);
        wrappedMap.set(source, wrapped);
        return wrapped;
    };
    const wrappedStore = wrapProjection(initialValue);
    if (fn) {
        const wrapCommit = write => {
            setProjectionWriteActive(true);
            try {
                write();
            } finally {
                setProjectionWriteActive(false);
            }
        };
        node = computed(
            () => {
                setProjectionWriteActive(true);
                try {
                    runProjectionComputed(wrappedStore, fn, options?.key || "id", wrapCommit);
                } finally {
                    setProjectionWriteActive(false);
                }
            },
            options?.name ? { name: options.name } : undefined
        );
        node._config &= ~CONFIG_AUTO_DISPOSE;
    }
    return { store: wrappedStore, node: node };
}
const DELETE = Symbol("STORE_PATH_DELETE");
function isPrototypePollutionKey(part) {
    return part === "__proto__" || part === "constructor" || part === "prototype";
}
function updatePath(current, args, i = 0) {
    let part,
        prev = current;
    if (i < args.length - 1) {
        part = args[i];
        const partType = typeof part;
        const isArray = Array.isArray(current);
        if (partType === "string" && isPrototypePollutionKey(part)) return;
        if (Array.isArray(part)) {
            for (let j = 0; j < part.length; j++) {
                args[i] = part[j];
                updatePath(current, args, i);
            }
            args[i] = part;
            return;
        } else if (isArray && partType === "function") {
            for (let j = 0; j < current.length; j++) {
                if (part(current[j], j)) {
                    args[i] = j;
                    updatePath(current, args, i);
                }
            }
            args[i] = part;
            return;
        } else if (isArray && partType === "object") {
            const { from: from = 0, to: to = current.length - 1, by: by = 1 } = part;
            for (let j = from; j <= to; j += by) {
                args[i] = j;
                updatePath(current, args, i);
            }
            args[i] = part;
            return;
        } else if (i < args.length - 2) {
            updatePath(current[part], args, i + 1);
            return;
        }
        prev = current[part];
    }
    let value = args[args.length - 1];
    if (typeof value === "function") {
        value = value(prev);
        if (value === prev) return;
    }
    if (part === undefined && value == undefined) return;
    if (value === DELETE) {
        delete current[part];
    } else if (
        part === undefined ||
        (isWrappable(prev) && isWrappable(value) && !Array.isArray(value))
    ) {
        const target = part !== undefined ? current[part] : current;
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (isPrototypePollutionKey(key)) continue;
            const desc = Object.getOwnPropertyDescriptor(value, key);
            if (desc.get || desc.set) Object.defineProperty(target, key, desc);
            else target[key] = desc.value;
        }
    } else {
        current[part] = value;
    }
}
const storePath = Object.assign(
    function storePath(...args) {
        return state => {
            updatePath(state, args);
        };
    },
    { DELETE: DELETE }
);
function snapshotImpl(item, track, map, lookup) {
    let target, isArray, override, result, unwrapped, v;
    if (!isWrappable(item)) return item;
    if (map && map.has(item)) return map.get(item);
    if (!map) map = new Map();
    if ((target = item[$TARGET] || lookup?.get(item)?.[$TARGET])) {
        if (track) trackSelf(target, $TRACK);
        override = target[STORE_OVERRIDE];
        isArray = Array.isArray(target[STORE_VALUE]);
        map.set(
            item,
            override
                ? (result = isArray ? [] : Object.create(Object.getPrototypeOf(target[STORE_VALUE])))
                : target[STORE_VALUE]
        );
        item = target[STORE_VALUE];
        lookup = storeLookup;
    } else {
        isArray = Array.isArray(item);
        map.set(item, item);
    }
    if (isArray) {
        const len = override?.length || item.length;
        for (let i = 0; i < len; i++) {
            v = override && i in override ? override[i] : item[i];
            if (v === $DELETED) continue;
            if (track && isWrappable(v)) wrap(v, target);
            if ((unwrapped = snapshotImpl(v, track, map, lookup)) !== v || result) {
                if (!result) map.set(item, (result = [...item]));
                result[i] = unwrapped;
            }
        }
    } else {
        const keys = getKeys(item, override);
        for (let i = 0, l = keys.length; i < l; i++) {
            let prop = keys[i];
            const desc = getPropertyDescriptor(item, override, prop);
            if (desc.get) continue;
            v = override && prop in override ? override[prop] : item[prop];
            if (track && isWrappable(v)) wrap(v, target);
            if ((unwrapped = snapshotImpl(v, track, map, lookup)) !== item[prop] || result) {
                if (!result) {
                    result = Object.create(Object.getPrototypeOf(item));
                    Object.assign(result, item);
                }
                result[prop] = unwrapped;
            }
        }
    }
    return result || item;
}
function snapshot(item, map, lookup) {
    return snapshotImpl(item, false, map, lookup);
}
function deep(store) {
    return snapshotImpl(store, true);
}
function trueFn() {
    return true;
}
const propTraps = {
    get(_, property, receiver) {
        if (property === $PROXY) return receiver;
        return _.get(property);
    },
    has(_, property) {
        if (property === $PROXY) return true;
        return _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
        return {
            configurable: true,
            enumerable: true,
            get() {
                return _.get(property);
            },
            set: trueFn,
            deleteProperty: trueFn
        };
    },
    ownKeys(_) {
        return _.keys();
    }
};
function resolveSource(s) {
    return !(s = typeof s === "function" ? s() : s) ? {} : s;
}
const $SOURCES = Symbol("MERGE_SOURCE");
function merge(...sources) {
    if (sources.length === 1 && typeof sources[0] !== "function") return sources[0];
    let proxy = false;
    const flattened = [];
    for (let i = 0; i < sources.length; i++) {
        const s = sources[i];
        proxy = proxy || (!!s && $PROXY in s);
        const childSources = !!s && s[$SOURCES];
        if (childSources) {
            for (let i = 0; i < childSources.length; i++) flattened.push(childSources[i]);
        } else flattened.push(typeof s === "function" ? ((proxy = true), createMemo(s)) : s);
    }
    if (SUPPORTS_PROXY && proxy) {
        return new Proxy(
            {
                get(property) {
                    if (property === $SOURCES) return flattened;
                    for (let i = flattened.length - 1; i >= 0; i--) {
                        const s = resolveSource(flattened[i]);
                        if (property in s) return s[property];
                    }
                },
                has(property) {
                    for (let i = flattened.length - 1; i >= 0; i--) {
                        if (property in resolveSource(flattened[i])) return true;
                    }
                    return false;
                },
                keys() {
                    const keys = new Set();
                    for (let i = 0; i < flattened.length; i++) {
                        const sourceKeys = Object.keys(resolveSource(flattened[i]));
                        for (let j = 0; j < sourceKeys.length; j++) keys.add(sourceKeys[j]);
                    }
                    return [...keys];
                }
            },
            propTraps
        );
    }
    const defined = Object.create(null);
    let nonTargetKey = false;
    let lastIndex = flattened.length - 1;
    for (let i = lastIndex; i >= 0; i--) {
        const source = flattened[i];
        if (!source) {
            i === lastIndex && lastIndex--;
            continue;
        }
        const sourceKeys = Object.getOwnPropertyNames(source);
        for (let j = sourceKeys.length - 1; j >= 0; j--) {
            const key = sourceKeys[j];
            if (key === "__proto__" || key === "constructor") continue;
            if (!defined[key]) {
                nonTargetKey = nonTargetKey || i !== lastIndex;
                const desc = Object.getOwnPropertyDescriptor(source, key);
                defined[key] = desc.get
                    ? { enumerable: true, configurable: true, get: desc.get.bind(source) }
                    : desc;
            }
        }
    }
    if (!nonTargetKey) return flattened[lastIndex];
    const target = {};
    const definedKeys = Object.keys(defined);
    for (let i = definedKeys.length - 1; i >= 0; i--) {
        const key = definedKeys[i],
            desc = defined[key];
        if (desc.get) Object.defineProperty(target, key, desc);
        else target[key] = desc.value;
    }
    target[$SOURCES] = flattened;
    return target;
}
function omit(props, ...keys) {
    if (SUPPORTS_PROXY && $PROXY in props) {
        return new Proxy(
            {
                get(property) {
                    return keys.includes(property) ? undefined : props[property];
                },
                has(property) {
                    return !keys.includes(property) && property in props;
                },
                keys() {
                    return Object.keys(props).filter(k => !keys.includes(k));
                }
            },
            propTraps
        );
    }
    const result = {};
    const propNames = Object.getOwnPropertyNames(props);
    const blocked = keys.length > 4 && propNames.length > keys.length ? new Set(keys) : undefined;
    for (const propName of propNames) {
        if (blocked ? !blocked.has(propName) : !keys.includes(propName)) {
            const desc = Object.getOwnPropertyDescriptor(props, propName);
            !desc.get && !desc.set && desc.enumerable && desc.writable && desc.configurable
                ? (result[propName] = desc.value)
                : Object.defineProperty(result, propName, desc);
        }
    }
    return result;
}
function mapArray(list, map, options) {
    const keyFn = typeof options?.keyed === "function" ? options.keyed : undefined;
    const indexes = map.length > 1;
    const wrappedMap = options?.name
        ? (...args) => {
            setStrictRead(options.name);
            try {
                return map(...args);
            } finally {
                setStrictRead(false);
            }
        }
        : map;
    const data = {
        _owner: createOwner(),
        _len: 0,
        _list: list,
        _items: [],
        _map: wrappedMap,
        _mappings: [],
        _nodes: [],
        _key: keyFn,
        _rows: keyFn || options?.keyed === false ? [] : undefined,
        _indexes: indexes && options?.keyed !== false ? [] : undefined,
        _byIndex: options?.keyed === false,
        _fallback: options?.fallback
    };
    const node = computed(updateKeyedMap.bind(data));
    data._owner._parentComputed = node;
    node._config &= ~CONFIG_AUTO_DISPOSE;
    return accessor(node);
}
const pureOptions = { ownedWrite: true };
function updateKeyedMap() {
    const newItems = this._list() || [],
        newLen = newItems.length;
    newItems[$TRACK];
    runWithOwner(this._owner, () => {
        let i,
            j,
            mapper = this._rows
                ? this._byIndex
                    ? () => {
                        this._rows[j] = signal(newItems[j], pureOptions);
                        return this._map(accessor(this._rows[j]), j);
                    }
                    : () => {
                        this._rows[j] = signal(newItems[j], pureOptions);
                        this._indexes && (this._indexes[j] = signal(j, pureOptions));
                        return this._map(
                            accessor(this._rows[j]),
                            this._indexes ? accessor(this._indexes[j]) : undefined
                        );
                    }
                : this._indexes
                    ? () => {
                        const item = newItems[j];
                        this._indexes[j] = signal(j, pureOptions);
                        return this._map(item, accessor(this._indexes[j]));
                    }
                    : () => {
                        const item = newItems[j];
                        return this._map(item);
                    };
        if (newLen === 0) {
            if (this._len !== 0) {
                this._owner.dispose(false);
                this._nodes = [];
                this._items = [];
                this._mappings = [];
                this._len = 0;
                this._rows && (this._rows = []);
                this._indexes && (this._indexes = []);
            }
            if (this._fallback && !this._mappings[0]) {
                this._mappings[0] = runWithOwner((this._nodes[0] = createOwner()), this._fallback);
            }
        } else if (this._len === 0) {
            if (this._nodes[0]) this._nodes[0].dispose();
            this._mappings = new Array(newLen);
            for (j = 0; j < newLen; j++) {
                this._items[j] = newItems[j];
                this._mappings[j] = runWithOwner((this._nodes[j] = createOwner()), mapper);
            }
            this._len = newLen;
        } else {
            let start,
                end,
                newEnd,
                item,
                key,
                newIndices,
                newIndicesNext,
                temp = new Array(newLen),
                tempNodes = new Array(newLen),
                tempRows = this._rows ? new Array(newLen) : undefined,
                tempIndexes = this._indexes ? new Array(newLen) : undefined;
            for (
                start = 0, end = Math.min(this._len, newLen);
                start < end &&
                (this._items[start] === newItems[start] ||
                    (this._rows && compare(this._key, this._items[start], newItems[start])));
                start++
            ) {
                if (this._rows) setSignal(this._rows[start], newItems[start]);
            }
            for (
                end = this._len - 1, newEnd = newLen - 1;
                end >= start &&
                newEnd >= start &&
                (this._items[end] === newItems[newEnd] ||
                    (this._rows && compare(this._key, this._items[end], newItems[newEnd])));
                end--, newEnd--
            ) {
                temp[newEnd] = this._mappings[end];
                tempNodes[newEnd] = this._nodes[end];
                tempRows && (tempRows[newEnd] = this._rows[end]);
                tempIndexes && (tempIndexes[newEnd] = this._indexes[end]);
            }
            newIndices = new Map();
            newIndicesNext = new Array(newEnd + 1);
            for (j = newEnd; j >= start; j--) {
                item = newItems[j];
                key = this._key ? this._key(item) : item;
                i = newIndices.get(key);
                newIndicesNext[j] = i === undefined ? -1 : i;
                newIndices.set(key, j);
            }
            for (i = start; i <= end; i++) {
                item = this._items[i];
                key = this._key ? this._key(item) : item;
                j = newIndices.get(key);
                if (j !== undefined && j !== -1) {
                    temp[j] = this._mappings[i];
                    tempNodes[j] = this._nodes[i];
                    tempRows && (tempRows[j] = this._rows[i]);
                    tempIndexes && (tempIndexes[j] = this._indexes[i]);
                    j = newIndicesNext[j];
                    newIndices.set(key, j);
                } else this._nodes[i].dispose();
            }
            for (j = start; j < newLen; j++) {
                if (j in temp) {
                    this._mappings[j] = temp[j];
                    this._nodes[j] = tempNodes[j];
                    if (tempRows) {
                        this._rows[j] = tempRows[j];
                        setSignal(this._rows[j], newItems[j]);
                    }
                    if (tempIndexes) {
                        this._indexes[j] = tempIndexes[j];
                        setSignal(this._indexes[j], j);
                    }
                } else {
                    this._mappings[j] = runWithOwner((this._nodes[j] = createOwner()), mapper);
                }
            }
            this._mappings = this._mappings.slice(0, (this._len = newLen));
            this._items = newItems.slice(0);
        }
    });
    return this._mappings;
}
function repeat(count, map, options) {
    const wrappedMap = options?.name
        ? i => {
            setStrictRead(options.name);
            try {
                return map(i);
            } finally {
                setStrictRead(false);
            }
        }
        : map;
    const node = computed(
        updateRepeat.bind({
            _owner: createOwner(),
            _len: 0,
            _offset: 0,
            _count: count,
            _map: wrappedMap,
            _nodes: [],
            _mappings: [],
            _from: options?.from,
            _fallback: options?.fallback
        })
    );
    node._config &= ~CONFIG_AUTO_DISPOSE;
    return accessor(node);
}
function updateRepeat() {
    const newLen = this._count();
    const from = this._from?.() || 0;
    runWithOwner(this._owner, () => {
        if (newLen === 0) {
            if (this._len !== 0) {
                this._owner.dispose(false);
                this._nodes = [];
                this._mappings = [];
                this._len = 0;
            }
            if (this._fallback && !this._mappings[0]) {
                this._mappings[0] = runWithOwner((this._nodes[0] = createOwner()), this._fallback);
            }
            return;
        }
        const to = from + newLen;
        const prevTo = this._offset + this._len;
        if (this._len === 0 && this._nodes[0]) this._nodes[0].dispose();
        for (let i = to; i < prevTo; i++) this._nodes[i - this._offset].dispose();
        if (this._offset < from) {
            let i = this._offset;
            while (i < from && i < this._len) this._nodes[i++].dispose();
            this._nodes.splice(0, from - this._offset);
            this._mappings.splice(0, from - this._offset);
        } else if (this._offset > from) {
            let i = prevTo - this._offset - 1;
            let difference = this._offset - from;
            this._nodes.length = this._mappings.length = newLen;
            while (i >= difference) {
                this._nodes[i] = this._nodes[i - difference];
                this._mappings[i] = this._mappings[i - difference];
                i--;
            }
            for (let i = 0; i < difference; i++) {
                this._mappings[i] = runWithOwner((this._nodes[i] = createOwner()), () =>
                    this._map(i + from)
                );
            }
        }
        for (let i = prevTo; i < to; i++) {
            this._mappings[i - from] = runWithOwner((this._nodes[i - from] = createOwner()), () =>
                this._map(i)
            );
        }
        this._mappings = this._mappings.slice(0, newLen);
        this._offset = from;
        this._len = newLen;
    });
    return this._mappings;
}
function compare(key, a, b) {
    return key ? key(a) === key(b) : true;
}
function boundaryComputed(fn, propagationMask) {
    const node = computed(fn, { lazy: true });
    node._notifyStatus = (status, error) => {
        const flags = status !== undefined ? status : node._statusFlags;
        const actualError = error !== undefined ? error : node._error;
        node._statusFlags &= ~node._propagationMask;
        node._queue.notify(node, node._propagationMask, flags, actualError);
    };
    node._propagationMask = propagationMask;
    node._config &= ~CONFIG_AUTO_DISPOSE;
    recompute(node, true);
    return node;
}
function createBoundChildren(owner, fn, queue, mask) {
    const parentQueue = owner._queue;
    parentQueue.addChild((owner._queue = queue));
    cleanup(() => parentQueue.removeChild(owner._queue));
    return runWithOwner(owner, () => {
        const c = computed(fn);
        return boundaryComputed(() => flatten(read(c)), mask);
    });
}
const ON_INIT = Symbol();
const RevealControllerContext = createContext(null);
let _revealUsed = false;
const FALSE_ACCESSOR = () => false;
const SEQUENTIAL_ACCESSOR = () => "sequential";
function isRevealController(slot) {
    return slot instanceof RevealController;
}
function isSlotReady(slot) {
    return isRevealController(slot) ? slot.isReady() : slot._sources.size === 0 && !slot._pending;
}
function isSlotMinimallyReady(slot) {
    return isRevealController(slot) ? slot.isMinimallyReady() : isSlotReady(slot);
}
function setSlotState(slot, controller, disabled, collapsed) {
    setSignal(slot._disabled, disabled);
    setSignal(slot._collapsed, collapsed);
    if (isRevealController(slot)) {
        if (!disabled && slot._parentController === controller) slot._parentController = undefined;
        return slot.evaluate(disabled, collapsed);
    }
    if (!disabled && slot._revealController === controller && slot._initialized)
        slot._revealController = undefined;
}
class RevealController {
    _orderAccessor;
    _collapsedAccessor;
    _slots = [];
    _parentController;
    _disabled = signal(false, { ownedWrite: true, _noSnapshot: true });
    _collapsed = signal(false, { ownedWrite: true, _noSnapshot: true });
    _ready = true;
    _minimallyReady = true;
    _evaluating = false;
    constructor(order, collapsed) {
        this._orderAccessor = order;
        this._collapsedAccessor = collapsed;
    }
    _forEachOwnedSlot(fn) {
        for (let i = 0; i < this._slots.length; i++) {
            const slot = this._slots[i];
            if ((isRevealController(slot) ? slot._parentController : slot._revealController) !== this)
                continue;
            if (fn(slot) === false) return false;
        }
        return true;
    }
    isReady() {
        return this._forEachOwnedSlot(isSlotReady);
    }
    isMinimallyReady() {
        const order = untrack(this._orderAccessor);
        if (order === "together") return this.isReady();
        if (order === "natural") {
            let hasSlot = false;
            let anyReady = false;
            this._forEachOwnedSlot(slot => {
                hasSlot = true;
                if (isSlotMinimallyReady(slot)) {
                    anyReady = true;
                    return false;
                }
            });
            return !hasSlot || anyReady;
        }
        let firstReady = true;
        this._forEachOwnedSlot(slot => {
            firstReady = isSlotMinimallyReady(slot);
            return false;
        });
        return firstReady;
    }
    register(slot) {
        if (this._slots.includes(slot)) return;
        this._slots.push(slot);
        const order = untrack(this._orderAccessor);
        (setSignal(slot._disabled, true),
            setSignal(
                slot._collapsed,
                order === "sequential" ? !!untrack(this._collapsedAccessor) : false
            ));
        untrack(() => this.evaluate());
    }
    unregister(slot) {
        const index = this._slots.indexOf(slot);
        if (index >= 0) this._slots.splice(index, 1);
        untrack(() => this.evaluate());
    }
    evaluate(disabledOverride, collapsedOverride) {
        if (this._evaluating) return;
        this._evaluating = true;
        const wasReady = this._ready;
        const wasMinReady = this._minimallyReady;
        try {
            const disabled = disabledOverride ?? read(this._disabled),
                order = untrack(this._orderAccessor),
                collapseTail = order === "sequential" && !!untrack(this._collapsedAccessor),
                collapsed = collapsedOverride ?? collapseTail;
            if (disabled) {
                this._forEachOwnedSlot(slot => setSlotState(slot, this, true, collapsed));
            } else if (order === "natural") {
                this._forEachOwnedSlot(slot => {
                    if (isRevealController(slot)) {
                        setSignal(slot._collapsed, false);
                        setSignal(slot._disabled, false);
                        slot.evaluate(false, false);
                    } else {
                        setSlotState(slot, this, !isSlotReady(slot), false);
                    }
                });
            } else if (order === "together") {
                const minReady = this._forEachOwnedSlot(isSlotMinimallyReady);
                this._forEachOwnedSlot(slot => setSlotState(slot, this, !minReady, false));
            } else {
                let pendingSeen = false;
                this._forEachOwnedSlot(slot => {
                    if (pendingSeen) return setSlotState(slot, this, true, collapseTail);
                    if (isSlotReady(slot)) return setSlotState(slot, this, false, false);
                    pendingSeen = true;
                    if (isRevealController(slot)) {
                        setSignal(slot._collapsed, false);
                        setSignal(slot._disabled, false);
                        slot.evaluate(false, false);
                    } else {
                        setSlotState(slot, this, true, false);
                    }
                });
            }
        } finally {
            this._ready = this.isReady();
            this._minimallyReady = this.isMinimallyReady();
            this._evaluating = false;
        }
        if (
            this._parentController &&
            (wasReady !== this._ready || wasMinReady !== this._minimallyReady)
        )
            this._parentController.evaluate();
    }
}
class CollectionQueue extends Queue {
    _collectionType;
    _sources = new Set();
    _tree;
    _pending = true;
    _disabled = signal(false, { ownedWrite: true, _noSnapshot: true });
    _error;
    _collapsed = signal(false, { ownedWrite: true, _noSnapshot: true });
    _revealController;
    _initialized = false;
    _onFn;
    _prevOn = ON_INIT;
    constructor(type) {
        super();
        this._collectionType = type;
    }
    run(type) {
        if (!type || (read(this._disabled) && (!_revealUsed || read(this._collapsed)))) return;
        return super.run(type);
    }
    notify(node, type, flags, error) {
        if (!(type & this._collectionType)) return super.notify(node, type, flags, error);
        if (this._initialized && this._onFn) {
            const currentOn = untrack(() => {
                try {
                    return this._onFn();
                } catch {
                    return ON_INIT;
                }
            });
            if (currentOn !== this._prevOn) {
                this._prevOn = currentOn;
                this._initialized = false;
                this._sources.clear();
            }
        }
        if (this._collectionType & STATUS_PENDING && this._initialized)
            return super.notify(node, type, flags, error);
        if (this._collectionType & STATUS_PENDING && flags & STATUS_ERROR) {
            return super.notify(node, STATUS_ERROR, flags, error);
        }
        if (flags & this._collectionType) {
            this._pending = true;
            const source = error?.source || node._error?.source;
            if (source) {
                const wasEmpty = this._sources.size === 0;
                this._sources.add(source);
                if (wasEmpty) setSignal(this._disabled, true);
                if (this._collectionType & STATUS_ERROR) {
                    setSignal(this._error, source._error?.cause ?? source._error);
                }
            }
        }
        type &= ~this._collectionType;
        return type ? super.notify(node, type, flags, error) : true;
    }
    checkSources() {
        for (const source of this._sources) {
            if (
                source._flags & REACTIVE_DISPOSED ||
                (!(source._statusFlags & this._collectionType) &&
                    !(this._collectionType & STATUS_ERROR && source._statusFlags & STATUS_PENDING))
            )
                this._sources.delete(source);
        }
        if (!this._sources.size) {
            if (
                this._collectionType & STATUS_PENDING &&
                this._pending &&
                !this._initialized &&
                this._tree
            ) {
                this._pending = !!(this._tree._statusFlags & this._collectionType);
            } else {
                this._pending = false;
            }
            if (!this._pending) {
                setSignal(this._disabled, false);
                if (this._onFn) {
                    try {
                        this._prevOn = untrack(() => this._onFn());
                    } catch {}
                }
            }
        }
        if (_revealUsed) this._revealController?.evaluate();
    }
}
function createCollectionBoundary(type, fn, fallback, onFn) {
    if (!getOwner()) {
        const message =
            "[NO_OWNER_BOUNDARY] Boundaries created outside a reactive context will never be disposed.";
        emitDiagnostic({
            code: "NO_OWNER_BOUNDARY",
            kind: "lifecycle",
            severity: "warn",
            message: message,
            data: { boundaryType: type === STATUS_PENDING ? "loading" : "error" }
        });
        console.warn(message);
    }
    const owner = createOwner();
    if (_revealUsed) setContext(RevealControllerContext, null, owner);
    const queue = new CollectionQueue(type);
    if (type === STATUS_ERROR)
        queue._error = signal(undefined, { ownedWrite: true, _noSnapshot: true });
    if (onFn) queue._onFn = onFn;
    const tree = (queue._tree = createBoundChildren(owner, fn, queue, type));
    untrack(() => {
        let pending = false;
        try {
            read(tree);
        } catch (e) {
            if (e instanceof NotReadyError) pending = true;
            else throw e;
        }
        queue._pending =
            pending || !!(tree._statusFlags & type) || tree._error instanceof NotReadyError;
    });
    const controller =
        _revealUsed && type === STATUS_PENDING ? getContext(RevealControllerContext) : null;
    if (controller) {
        queue._revealController = controller;
        controller.register(queue);
        cleanup(() => controller.unregister(queue));
    }
    return accessor(
        computed(() => {
            if (!read(queue._disabled)) {
                const resolved = read(tree);
                if (!untrack(() => read(queue._disabled))) return ((queue._initialized = true), resolved);
            }
            if (_revealUsed && read(queue._collapsed)) return undefined;
            return fallback(queue);
        })
    );
}
function createLoadingBoundary(fn, fallback, options) {
    return createCollectionBoundary(STATUS_PENDING, fn, () => fallback(), options?.on);
}
function createErrorBoundary(fn, fallback) {
    return createCollectionBoundary(STATUS_ERROR, fn, queue =>
        fallback(accessor(queue._error), () => {
            for (const source of queue._sources) recompute(source);
            schedule();
        })
    );
}
function createRevealOrder(fn, options) {
    _revealUsed = true;
    const owner = createOwner();
    const parentController = getContext(RevealControllerContext);
    const order = options?.order || SEQUENTIAL_ACCESSOR,
        collapsed = options?.collapsed || FALSE_ACCESSOR;
    const controller = new RevealController(order, collapsed);
    setContext(RevealControllerContext, controller, owner);
    return runWithOwner(owner, () => {
        const value = fn();
        computed(() => {
            order();
            collapsed();
            controller.evaluate();
        });
        if (parentController) {
            controller._parentController = parentController;
            parentController.register(controller);
            cleanup(() => parentController.unregister(controller));
        }
        return value;
    });
}
function flatten(children, options) {
    if (typeof children === "function" && !children.length) {
        if (options?.doNotUnwrap) return children;
        do {
            children = children();
        } while (typeof children === "function" && !children.length);
    }
    if (
        options?.skipNonRendered &&
        (children == null || children === true || children === false || children === "")
    )
        return;
    if (Array.isArray(children)) {
        let results = [];
        if (flattenArray(children, results, options)) {
            return () => {
                let nested = [];
                flattenArray(results, nested, { ...options, doNotUnwrap: false });
                return nested;
            };
        }
        return results;
    }
    return children;
}
function flattenArray(children, results = [], options) {
    let notReady = null;
    let needsUnwrap = false;
    for (let i = 0; i < children.length; i++) {
        try {
            let child = children[i];
            if (typeof child === "function" && !child.length) {
                if (options?.doNotUnwrap) {
                    results.push(child);
                    needsUnwrap = true;
                    continue;
                }
                do {
                    child = child();
                } while (typeof child === "function" && !child.length);
            }
            if (Array.isArray(child)) {
                needsUnwrap = flattenArray(child, results, options);
            } else if (
                options?.skipNonRendered &&
                (child == null || child === true || child === false || child === "")
            ) {
            } else results.push(child);
        } catch (e) {
            if (!(e instanceof NotReadyError)) throw e;
            notReady = e;
        }
    }
    if (notReady) throw notReady;
    return needsUnwrap;
}
const DEV = DEV$1;
export {
    $PROXY,
    $REFRESH,
    $TARGET,
    $TRACK,
    ContextNotFoundError,
    DEV,
    NoOwnerError,
    NotReadyError,
    SUPPORTS_PROXY,
    action,
    clearSnapshots,
    createContext,
    createEffect,
    createErrorBoundary,
    createLoadingBoundary,
    createMemo,
    createOptimistic,
    createOptimisticStore,
    createOwner,
    createProjection,
    createReaction,
    createRenderEffect,
    createRevealOrder,
    createRoot,
    createSignal,
    createStore,
    createTrackedEffect,
    deep,
    enableExternalSource,
    enforceLoadingBoundary,
    flatten,
    flush,
    getContext,
    getNextChildId,
    getObserver,
    getOwner,
    isDisposed,
    isEqual,
    isPending,
    isRefreshing,
    isWrappable,
    latest,
    mapArray,
    markSnapshotScope,
    merge,
    omit,
    onCleanup,
    onSettled,
    peekNextChildId,
    reconcile,
    refresh,
    releaseSnapshotScope,
    repeat,
    resolve,
    runWithOwner,
    setContext,
    setSnapshotCapture,
    snapshot,
    storePath,
    untrack
};
