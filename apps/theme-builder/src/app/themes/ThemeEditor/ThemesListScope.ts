import { createScopeProvider, defineScope } from "@web/solid-scope";
import {
  action,
  createStore,
  onSettled,
  refresh,
} from "solid-js";
import {
  getThemesDeltas,
  saveTheme,
} from "~/app/themes/ThemeEditor/ThemeRepository.server";
import { useNavigate } from "@web/router";
import { createId } from "@paralleldrive/cuid2";
import { createModels, ModelDelta } from "@web/solid-delta";
import { createDeltaTracker } from "@web/solid-delta";
import { ThemeDefinition } from "~/models/ThemeDefinition.ts";

export const ThemesListScope = createScopeProvider();

export const useThemesListScope = defineScope(ThemesListScope, () => {
  const [themeDeltas, setThemeDeltas] = createStore(
    () =>
      getThemesDeltas().then((res) => {
        setTimeout(() => acked.mark(res));
        return res;
      }),
    [] as readonly ModelDelta<ThemeDefinition>[],
  );
  const acked = createDeltaTracker(() => themeDeltas);

  const [themes, createDeltas] = createModels(() => themeDeltas);

  const navigate = useNavigate();

  onSettled(() => {
    window.addEventListener("beforeunload", (e) => {
      if (acked.inverse().length > 0) {
        e.preventDefault();
        return "Changes are not saved. Are you sure you want to leave?";
      }
    });
  });

  const saveDeltas = action(function* (deltas?: ModelDelta<ThemeDefinition>[]) {
    if (deltas != null) {
      pushThemeDeltas(deltas);
    }

    const uncommitted = acked.inverseIncluding(deltas ?? []);
    yield saveTheme(uncommitted);

    refresh(themeDeltas);
  });

  function pushThemeDeltas(deltas: ModelDelta<ThemeDefinition>[]) {
    setThemeDeltas((draft) => {
      draft.push(...deltas);
    });
  }

  async function addNewThemeLocal() {
    const newId = createId();
    const deltas = createDeltas("create", {
      id: newId,
      name: "New Theme",
      class: "newTheme",
      mode: "light",
    });

    pushThemeDeltas(deltas);

    navigate(`/editor/${newId}`);
  }

  function updateThemeLocal(id: string, theme: Partial<ThemeDefinition>) {
    const deltas = createDeltas(id, theme);
    pushThemeDeltas(deltas);
  }

  async function deleteThemeAndSave(id: string) {
    const deltas = createDeltas("delete", id);
    await saveDeltas(deltas);
  }

  return {
    themes,
    addNewThemeLocal,
    updateThemeLocal,
    deleteThemeAndSave,
    saveDeltas,
  };
});
