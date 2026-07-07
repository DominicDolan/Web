import { createEffect, createSignal } from "solid-js";
import "./style.css";

import minimalCss from "@web/lins/minimal.css?url";
import foundryCss from "@web/lins/foundry.css?url";
import materialInspiredCss from "@web/lins/materialInspired.css?url";
import signalBloomCss from "@web/lins/signalBloom.css?url";
import apertureStaticCss from "@web/lins/aperture.css?url";
import apertureGeneratedCss from "@web/lins/aperture-generated.css?url";
import { linsThemes, type LinsElementCategoryInfo, type LinsThemeInfo, type LinsVariantInfo } from "@web/lins/themes";

type ThemeOption = {
  meta: LinsThemeInfo;
  css: string;
};

const themeCssById: Record<string, string> = {
  minimal: minimalCss,
  foundry: foundryCss,
  materialInspired: materialInspiredCss,
  signalBloom: signalBloomCss,
  aperture: apertureGeneratedCss,
};

const themeMetadata: readonly LinsThemeInfo[] = linsThemes;

const themes: ThemeOption[] = themeMetadata.flatMap((meta) => {
  if (meta.id !== "aperture") {
    return [{ meta, css: themeCssById[meta.id] ?? minimalCss }];
  }

  return [
    {
      meta: {
        ...meta,
        id: "aperture-static",
        name: "Aperture (Static)",
        description: "Previous hand-authored Aperture CSS kept for side-by-side comparison.",
      },
      css: apertureStaticCss,
    },
    { meta, css: apertureGeneratedCss },
  ];
});

function category(theme: LinsThemeInfo, id: string): LinsElementCategoryInfo | undefined {
  return theme.elementCategories.find((elementCategory) => elementCategory.id === id);
}

function variants(theme: LinsThemeInfo, categoryId: string): readonly LinsVariantInfo[] {
  return category(theme, categoryId)?.variants ?? [];
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sampleTextForVariant(variant: LinsVariantInfo): string {
  return variant.name || titleCase(variant.id);
}

function isTypographyRole(variant: LinsVariantInfo): boolean {
  return ["display", "headline", "title", "body", "label"].includes(variant.id);
}

function isTypographySize(variant: LinsVariantInfo): boolean {
  return ["large", "medium", "small"].includes(variant.id);
}

function App() {
  const [currentTheme, setCurrentTheme] = createSignal(themes[0]);
  const [currentColorThemeId, setCurrentColorThemeId] = createSignal(themes[0]?.meta.colorThemes[0]?.id ?? "light");
  const [activeTab, setActiveTab] = createSignal("overview");
  const [sideNavItem, setSideNavItem] = createSignal("dashboard");

  const currentColorTheme = () => {
    const theme = currentTheme().meta;
    return theme.colorThemes.find((colorTheme) => colorTheme.id === currentColorThemeId()) ?? theme.colorThemes[0];
  };

  const colorValueForRole = (roleId: string) => currentColorTheme()?.colors.find((color) => color.role === roleId);

  createEffect(currentTheme, (theme) => {
    let link = document.getElementById("lins-theme") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "lins-theme";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = theme.css;

    if (!theme.meta.colorThemes.some((colorTheme) => colorTheme.id === currentColorThemeId())) {
      setCurrentColorThemeId(theme.meta.colorThemes[0]?.id ?? "light");
    }
  });

  const theme = () => currentTheme().meta;
  const colorTheme = () => currentColorTheme();

  return (
    <div class={`${theme().className} ${colorTheme()?.className ?? "light"} min-h-screen`} id="app">
      <nav class="top flex items-center gap-4 px-6 py-3">
        <h1 class="title large">LINS Showcase</h1>
        <div class="flex-1" />
        {themes.map((themeOption) => (
          <button
            class={themeOption.meta.id === theme().id ? "flat" : "text"}
            onClick={() => setCurrentTheme(themeOption)}
          >
            {themeOption.meta.name}
          </button>
        ))}
        {theme().colorThemes.map((themeMode) => (
          <button
            class={themeMode.id === currentColorThemeId() ? "flat" : "text"}
            onClick={() => setCurrentColorThemeId(themeMode.id)}
          >
            {themeMode.name}
          </button>
        ))}
      </nav>

      <div class="flex flex-1">
        <aside class="w-64 shrink-0 p-4">
          <nav>
            <ul class="nav flex flex-col gap-1">
              {["dashboard", "components", "forms", "settings"].map((item) => (
                <li>
                  <a href="#" aria-current={sideNavItem() === item ? "page" : undefined} onClick={() => setSideNavItem(item)}>
                    <i>{item === "dashboard" ? "dashboard" : item === "components" ? "widgets" : item === "forms" ? "edit_note" : "settings"}</i> {titleCase(item)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main class="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
          <nav aria-label="Breadcrumb">
            <ol class="flex gap-2">
              <li><a href="#">Home</a></li>
              <li><a href="#">Themes</a></li>
              <li><a href="#" aria-current="page">{theme().name}</a></li>
            </ol>
          </nav>

          <hgroup class="flex flex-col gap-1">
            <h1 class="display large">{theme().name} Showcase</h1>
            <p class="display small variant">{theme().description}</p>
          </hgroup>

          <ul role="tablist" class="flex gap-2">
            {["overview", "cards", "forms", "lists"].map((tab) => (
              <li
                aria-selected={activeTab() === tab ? "true" : "false"}
                onClick={() => setActiveTab(tab)}
              >
                {titleCase(tab)}
              </li>
            ))}
          </ul>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Theme Metadata</h2>
              <p>Theme identity, colour themes, and exported element categories</p>
            </hgroup>

            <article class="outlined flex flex-col gap-5 p-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p class="label small variant">Theme class</p>
                  <code>{theme().className}</code>
                </div>
                <div>
                  <p class="label small variant">Colour theme</p>
                  <code>{colorTheme()?.className}</code>
                </div>
                <div>
                  <p class="label small variant">Categories</p>
                  <code>{theme().elementCategories.length}</code>
                </div>
              </div>

              <ul class="chips flex flex-wrap gap-2">
                {theme().elementCategories.map((elementCategory) => (
                  <li title={elementCategory.description}>{elementCategory.name}</li>
                ))}
              </ul>
            </article>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Colours</h2>
              <p>Only colour roles and palette values exported by the active theme are shown</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {theme().colors.map((colorRole) => {
                const colorValue = colorValueForRole(colorRole.id);
                return (
                  <article class={`flat ${colorRole.id} flex flex-col gap-3 p-5`}>
                    <h3>{colorRole.name}</h3>
                    <p>{colorRole.description}</p>
                    <dl class="flex flex-col gap-1">
                      <div>
                        <dt class="label small variant">Token</dt>
                        <dd class="label small"><code>{colorRole.cssVariable}</code></dd>
                      </div>
                      <div>
                        <dt class="label small variant">Value</dt>
                        <dd class="label small"><code>{colorValue?.color ?? "—"}</code></dd>
                      </div>
                      <div>
                        <dt class="label small variant">On value</dt>
                        <dd class="label small"><code>{colorValue?.onColor ?? "—"}</code></dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div class="flex flex-wrap gap-3 items-center">
              {theme().colors.map((colorRole) => (
                <button class={`flat ${colorRole.id}`}>{colorRole.name}</button>
              ))}
            </div>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Buttons</h2>
              <p>{category(theme(), "button")?.description}</p>
            </hgroup>

            <div class="flex flex-wrap gap-3 items-center">
              {variants(theme(), "button").map((variant) => (
                <button class={variant.className} title={variant.description}>
                  {variant.id === "icon" ? <i>favorite</i> : sampleTextForVariant(variant)}
                </button>
              ))}
              <button class="flat" disabled>Disabled</button>
            </div>

            <div role="radiogroup" aria-label="View mode">
              <button aria-checked="true">Grid</button>
              <button>List</button>
              <button>Table</button>
            </div>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Cards & Surfaces</h2>
              <p>{category(theme(), "card")?.description}</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variants(theme(), "card").map((variant) => (
                <article class={`${variant.className} flex flex-col gap-4 p-6`}>
                  <hgroup>
                    <h3>{variant.name} Card</h3>
                    <p>{variant.default ? "Default card variant" : variant.description}</p>
                  </hgroup>
                  <section>
                    <p>{variant.description}</p>
                  </section>
                  <footer class="flex gap-2">
                    <button class="text">Cancel</button>
                    <button class="flat">Action</button>
                  </footer>
                </article>
              ))}
            </div>

            <article class="elevated flex flex-col gap-4 p-6">
              <hgroup>
                <h3>Nested Cards</h3>
                <p>Nested-card behaviour is controlled by the active theme CSS</p>
              </hgroup>
              <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <article class="flex flex-col gap-3 p-4">
                  <h4>Nested Item A</h4>
                  <p>Context styling comes from the card category.</p>
                </article>
                <article class="flex flex-col gap-3 p-4">
                  <h4>Nested Item B</h4>
                  <p>Authors can still override with explicit variants.</p>
                </article>
              </section>
            </article>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article aria-selected="true" role={"button"} class="outlined flex flex-col gap-3 p-5">
                <h3>Selected</h3>
                <p>This card is selected with aria-selected=&quot;true&quot;.</p>
              </article>
              <article aria-selected="false" role={"button"} class="outlined flex flex-col gap-3 p-5">
                <h3>Deselected</h3>
                <p>This card is deselected with aria-selected=&quot;false&quot;.</p>
              </article>
              <article role={"button"} class="outlined flex flex-col gap-3 p-5">
                <h3>Interactive</h3>
                <p>Cards with role=&quot;button&quot; gain interactive states.</p>
              </article>
            </div>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Typography</h2>
              <p>{category(theme(), "typography")?.description}</p>
            </hgroup>

            <article class="outlined flex flex-col gap-6 p-6">
              {variants(theme(), "typography").filter(isTypographyRole).map((role) => (
                <div class="flex flex-col gap-2">
                  {variants(theme(), "typography").filter(isTypographySize).map((size) => (
                    <p class={`${role.className} ${size.className}`}>{role.name} {size.name}</p>
                  ))}
                  {variants(theme(), "typography").some((variant) => variant.id === "variant") && (
                    <p class={`${role.className} medium variant`}>{role.name} Variant</p>
                  )}
                </div>
              ))}
              <hr />
              <p>Inline <code>code</code> and horizontal rules come from the inline text category.</p>
            </article>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Forms & Inputs</h2>
              <p>{category(theme(), "text-input")?.description}</p>
            </hgroup>

            <article class="elevated p-6">
              <form class="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {variants(theme(), "text-input").map((variant) => (
                    <form-field class="flex flex-col gap-1">
                      <label>{variant.name} Input</label>
                      <input-shell class={variant.className} title={variant.description}>
                        <input type="text" placeholder={`${variant.name} input`} />
                      </input-shell>
                      <output>{variant.description}</output>
                    </form-field>
                  ))}
                </div>

                <form-field class="flex flex-col gap-1">
                  <label>Email Address</label>
                  <input-shell class="flex gap-2 items-center">
                    <i>mail</i>
                    <input type="email" placeholder="john@example.com" required />
                  </input-shell>
                  <output></output>
                </form-field>

                <form-field class="flex flex-col gap-1">
                  <label>Bio</label>
                  <textarea rows={3} placeholder="Tell us about yourself..." />
                </form-field>

                <form-field class="flex flex-col gap-1">
                  <label>Country</label>
                  <select>
                    <option value="">Select a country...</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                    <option>Australia</option>
                  </select>
                </form-field>

                <div class="flex gap-4 items-center">
                  <form-field class="flex items-center gap-2">
                    <input type="checkbox" id="terms" />
                    <label for="terms">I agree to the terms</label>
                  </form-field>
                  <form-field class="flex items-center gap-2">
                    <input type="radio" name="plan" id="free" checked />
                    <label for="free">Free</label>
                  </form-field>
                  <form-field class="flex items-center gap-2">
                    <input type="radio" name="plan" id="pro" />
                    <label for="pro">Pro</label>
                  </form-field>
                </div>

                <footer class="flex gap-2 justify-end">
                  <button class="text" type="reset">Reset</button>
                  <button class="flat" type="submit">Submit</button>
                </footer>
              </form>
            </article>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Lists, Chips & Tabs</h2>
              <p>List variants are read from the active theme metadata.</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variants(theme(), "list").map((variant) => (
                <article class="outlined flex flex-col gap-4 p-5">
                  <h3>{variant.name}</h3>
                  <p>{variant.description}</p>
                  <ul class={`${variant.className} ${variant.id === "chips" ? "flex flex-wrap gap-2" : "flex flex-col gap-1"}`}>
                    <li aria-current={variant.id === "nav" ? "page" : undefined}><a href="#">Dashboard</a></li>
                    <li><a href="#">Analytics</a></li>
                    <li><a href="#">Reports</a></li>
                    <li><a href="#">Settings</a></li>
                  </ul>
                </article>
              ))}
            </div>

            {variants(theme(), "tab-list").map((variant) => (
              <article class="outlined flex flex-col gap-4 p-5">
                <h3>{variant.name} Tabs</h3>
                <p>{variant.description}</p>
                <ul role="tablist" class={`${variant.className} flex gap-2`}>
                  <li aria-selected="true">Overview</li>
                  <li aria-selected="false">Analytics</li>
                  <li aria-selected="false">Reports</li>
                  <li aria-selected="false">Export</li>
                </ul>
              </article>
            ))}
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Icons</h2>
              <p>{category(theme(), "icon")?.description}</p>
            </hgroup>

            <div class="flex items-end gap-6">
              {variants(theme(), "icon").map((variant) => (
                <div class="flex flex-col items-center gap-2">
                  <i class={variant.className}>home</i>
                  <span class="label small variant">{variant.name}</span>
                </div>
              ))}
            </div>

            <div class="flex gap-3">
              {["settings", "favorite", "share", "delete", "more_vert"].map((icon) => (
                <button class="icon"><i>{icon}</i></button>
              ))}
            </div>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Empty States & Loading</h2>
              <p>{category(theme(), "empty-state")?.description}</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variants(theme(), "empty-state").map((variant) => (
                <article class="outlined flex flex-col gap-3 p-5">
                  <h3>{variant.name}</h3>
                  <p>{variant.description}</p>
                  <empty-state class={`${variant.className} ${variant.id === "empty" ? "flex flex-col items-center gap-4 p-8" : "flex flex-col gap-3 p-4"}`} aria-busy={variant.id === "skeleton" ? "true" : undefined}>
                    {variant.id === "skeleton" ? (
                      <>
                        <div class="h-4 w-3/4"></div>
                        <div class="h-4 w-1/2"></div>
                        <div class="h-4 w-5/6"></div>
                      </>
                    ) : (
                      <>
                        <i class="xlarge">inbox</i>
                        <h3>No results found</h3>
                        <p>Try adjusting your search filters.</p>
                      </>
                    )}
                  </empty-state>
                </article>
              ))}
            </div>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Dialogs & Popovers</h2>
              <p>{category(theme(), "dialog")?.description}</p>
            </hgroup>

            <div class="flex gap-3">
              <button class="outlined" onClick={() => {
                ;(document.getElementById("demo-dialog") as HTMLDialogElement)?.showModal();
              }}>
                Open Dialog
              </button>
            </div>

            <dialog id="demo-dialog" closedby="any" class="h-full w-full" popover>
              <div class="h-full w-full flex items-center justify-center">
                <article>
                  <hgroup>
                    <h3>Confirm Action</h3>
                    <p>This action cannot be undone.</p>
                  </hgroup>
                  <section class="p-4">
                    <p>Are you sure you want to proceed with this action? All changes will be permanent.</p>
                  </section>
                  <footer class="flex gap-2 justify-end">
                    <button class="text" onClick={() => {
                      ;(document.getElementById("demo-dialog") as HTMLDialogElement)?.close();
                    }}>Cancel</button>
                    <button class="flat error" onClick={() => {
                      (document.getElementById("demo-dialog") as HTMLDialogElement)?.close();
                    }}>Confirm</button>
                  </footer>
                </article>
              </div>
            </dialog>
          </section>

          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Data Display</h2>
              <p>Label/value pairs and metadata</p>
            </hgroup>

            <article class="outlined p-6">
              <dl class="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ["Status", "Active"],
                  ["Theme", theme().name],
                  ["Mode", colorTheme()?.name ?? "Default"],
                  ["Variants", String(theme().elementCategories.reduce((total, elementCategory) => total + elementCategory.variants.length, 0))],
                ].map(([label, value]) => (
                  <div class="flex flex-col gap-1">
                    <dt class="label medium variant">{label}</dt>
                    <dd class="label medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </section>

        </main>
      </div>
    </div>
  );
}

export default App;
