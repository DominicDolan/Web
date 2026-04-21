import {Extension} from "@codemirror/state";
import {EditorState, Transaction} from "@codemirror/state";
import {Decoration, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {EditorView} from "codemirror";

// Make the given 1-based line numbers read-only
export function readOnlyLines(lines: number[]): Extension {
    const locked = new Set(lines);

    return EditorState.transactionFilter.of((tr: Transaction) => {
        if (!tr.docChanged) return tr;

        const state = tr.startState;

        // Resolve special values (-1 = last line) per transaction,
        // since the number of lines can change over time.
        const lastLineNumber = state.doc.lines;
        const lockedLines = new Set<number>();

        for (const line of lines) {
            if (line === -1) {
                lockedLines.add(lastLineNumber);
            } else if (line >= 1 && line <= lastLineNumber) {
                lockedLines.add(line);
            }
            // silently ignore out-of-range values
        }

        // If after resolution we have nothing to lock, just allow
        if (lockedLines.size === 0) return tr;

        let blocked = false;

        tr.changes.iterChanges((fromA, toA) => {
            if (blocked) return;

            const fromLine = state.doc.lineAt(fromA).number;
            const toLine = state.doc.lineAt(toA).number;

            for (let ln = fromLine; ln <= toLine; ln++) {
                if (lockedLines.has(ln)) {
                    blocked = true;
                    break;
                }
            }
        });

        if (blocked) {
            // Cancel the transaction: nothing is applied
            return [];
        }

        return tr;
    });
}

/**
 * Visual styling for read-only lines.
 * Adds a CSS class to those lines.
 *
 * `lines` are 1-based; -1 means "last line".
 */
export function highlightReadOnlyLines(lines: number[], cssClass: string): Extension {
    return ViewPlugin.fromClass(
        class {
            decorations;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            private buildDecorations(view: EditorView) {
                const builder = Decoration.set([]);
                const state = view.state;
                const lastLineNumber = state.doc.lines;

                const resolvedLines = new Set<number>();
                for (const line of lines) {
                    if (line === -1) resolvedLines.add(lastLineNumber);
                    else if (line >= 1 && line <= lastLineNumber) resolvedLines.add(line);
                }

                // Build new decorations
                const decos: any[] = [];
                for (const ln of resolvedLines) {
                    const line = state.doc.line(ln);
                    const deco = Decoration.line({
                        attributes: { class: cssClass },
                    }).range(line.from);
                    decos.push(deco);
                }

                return Decoration.set(decos);
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );
}

export function onChangeExtension(cb: (value: string, view: EditorView) => void) {
    return EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const value = update.state.doc.toString();
        cb(value, update.view);
    });
}
