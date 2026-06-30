import { createSignal, For } from "solid-js";
import "./layout.css";

const themes = [
  { id: "minimal", label: "Minimal", class: "minimalTheme" },
];

function App() {
  const [currentTheme, setCurrentTheme] = createSignal(themes[0]);
  const [activeTab, setActiveTab] = createSignal("overview");
  const [sideNavItem, setSideNavItem] = createSignal("dashboard");

  return (
    <div class={`${currentTheme().class} light min-h-screen`} id="app">
      {/* Top Navigation */}
      <nav class="top flex items-center gap-4 px-6 py-3">
        <h1 class="title large">LINS Showcase</h1>
        <div class="flex-1" />
        <For each={themes}>
          {(theme) => (
            <button
              class={theme.id === currentTheme().id ? "flat" : "text"}
              onClick={() => setCurrentTheme(theme)}
            >
              {theme.label}
            </button>
          )}
        </For>
        <button class="icon"><i>dark_mode</i></button>
      </nav>

      <div class="flex flex-1">
        {/* Side Navigation */}
        <aside class="w-64 shrink-0 p-4">
          <nav>
            <ul class="nav flex flex-col gap-1">
              <li aria-current={sideNavItem() === "dashboard" ? "page" : undefined}>
                <a href="#" onClick={() => setSideNavItem("dashboard")}>
                  <i>dashboard</i> Dashboard
                </a>
              </li>
              <li aria-current={sideNavItem() === "components" ? "page" : undefined}>
                <a href="#" onClick={() => setSideNavItem("components")}>
                  <i>widgets</i> Components
                </a>
              </li>
              <li aria-current={sideNavItem() === "forms" ? "page" : undefined}>
                <a href="#" onClick={() => setSideNavItem("forms")}>
                  <i>edit_note</i> Forms
                </a>
              </li>
              <li aria-current={sideNavItem() === "settings" ? "page" : undefined}>
                <a href="#" onClick={() => setSideNavItem("settings")}>
                  <i>settings</i> Settings
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main class="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb">
            <ol class="flex gap-2">
              <li><a href="#">Home</a></li>
              <li><a href="#">Components</a></li>
              <li><a href="#" aria-current="page">Showcase</a></li>
            </ol>
          </nav>

          {/* Page Header */}
          <hgroup class="flex flex-col gap-1">
            <h1 class="display large">Component Showcase</h1>
            <p class="display small variant">Explore the full range of LINS styled elements</p>
          </hgroup>

          {/* Tab Navigation */}
          <ul role="tablist" class="flex gap-2">
            <li
              aria-selected={activeTab() === "overview" ? "true" : "false"}
              onClick={() => setActiveTab("overview")}
            >Overview</li>
            <li
              aria-selected={activeTab() === "cards" ? "true" : "false"}
              onClick={() => setActiveTab("cards")}
            >Cards</li>
            <li
              aria-selected={activeTab() === "forms" ? "true" : "false"}
              onClick={() => setActiveTab("forms")}
            >Forms</li>
            <li
              aria-selected={activeTab() === "lists" ? "true" : "false"}
              onClick={() => setActiveTab("lists")}
            >Lists</li>
          </ul>

          {/* Buttons Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Buttons</h2>
              <p>All button variants and states</p>
            </hgroup>

            <div class="flex flex-wrap gap-3 items-center">
              <button class="elevated">Elevated</button>
              <button class="flat">Flat</button>
              <button class="outlined">Outlined</button>
              <button class="text">Text</button>
              <button class="plain">Plain</button>
              <button class="icon"><i>favorite</i></button>
              <button class="flat" disabled>Disabled</button>
            </div>

            <div class="flex flex-wrap gap-3 items-center">
              <button class="flat primary">Primary</button>
              <button class="flat accent">Accent</button>
              <button class="flat success">Success</button>
              <button class="flat warning">Warning</button>
              <button class="flat error">Error</button>
            </div>

            {/* Radio Group / Segmented Buttons */}
            <div role="radiogroup" aria-label="View mode">
              <button aria-checked="true">Grid</button>
              <button>List</button>
              <button>Table</button>
            </div>
          </section>

          {/* Cards Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Cards & Surfaces</h2>
              <p>Surface variants and interactive cards</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <article class="elevated flex flex-col gap-4 p-6">
                <hgroup>
                  <h3>Elevated Card</h3>
                  <p>With shadow, popping off the page</p>
                </hgroup>
                <section>
                  <p>This is the default card appearance with a box shadow for depth.</p>
                </section>
                <footer class="flex gap-2">
                  <button class="text">Cancel</button>
                  <button class="flat">Action</button>
                </footer>
              </article>

              <article class="flat flex flex-col gap-4 p-6">
                <hgroup>
                  <h3>Flat Card</h3>
                  <p>Filled surface, no shadow</p>
                </hgroup>
                <section>
                  <p>A flat surface for less visual emphasis while still having a distinct background.</p>
                </section>
                <footer class="flex gap-2">
                  <button class="text">Learn More</button>
                </footer>
              </article>

              <article class="outlined flex flex-col gap-4 p-6">
                <hgroup>
                  <h3>Outlined Card</h3>
                  <p>Border only, no fill</p>
                </hgroup>
                <section>
                  <p>Medium emphasis with a subtle border. Great for nested content.</p>
                </section>
                <footer class="flex gap-2">
                  <button class="outlined">Details</button>
                </footer>
              </article>

              <article class="tonal flex flex-col gap-4 p-6">
                <hgroup>
                  <h3>Tonal Card</h3>
                  <p>Low-opacity colour background</p>
                </hgroup>
                <section>
                  <p>A gentle tint of the active colour for subtle emphasis.</p>
                </section>
              </article>

              <article class="inset flex flex-col gap-4 p-6">
                <hgroup>
                  <h3>Inset Card</h3>
                  <p>Recessed inner shadow</p>
                </hgroup>
                <section>
                  <p>An inset surface that feels embedded into the background.</p>
                </section>
              </article>

              <article role="button" class="outlined flex flex-col gap-4 p-6">
                <hgroup>
                  <h3>Interactive Card</h3>
                  <p>Click me — I have hover states</p>
                </hgroup>
                <section>
                  <p>Cards with role="button" gain pointer cursor and hover elevation.</p>
                </section>
              </article>
            </div>

            {/* Nested Card */}
            <article class="elevated flex flex-col gap-4 p-6">
              <hgroup>
                <h3>Nested Cards</h3>
                <p>Cards inside cards auto-demote to outlined</p>
              </hgroup>
              <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <article class="flex flex-col gap-3 p-4">
                  <h4>Nested Item A</h4>
                  <p>Auto-outlined nested card</p>
                </article>
                <article class="flex flex-col gap-3 p-4">
                  <h4>Nested Item B</h4>
                  <p>Auto-outlined nested card</p>
                </article>
              </section>
            </article>

            {/* Colour role cards */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article class="tonal success flex flex-col gap-3 p-5">
                <h3>Success</h3>
                <p>Operation completed successfully.</p>
              </article>
              <article class="tonal warning flex flex-col gap-3 p-5">
                <h3>Warning</h3>
                <p>You are approaching your storage limit.</p>
              </article>
              <article class="tonal error flex flex-col gap-3 p-5">
                <h3>Error</h3>
                <p>Something went wrong. Please try again.</p>
              </article>
            </div>
          </section>

          {/* Typography Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Typography</h2>
              <p>The composable type scale</p>
            </hgroup>

            <article class="outlined flex flex-col gap-6 p-6">
              <div class="flex flex-col gap-2">
                <p class="display large">Display Large</p>
                <p class="display medium">Display Medium</p>
                <p class="display small">Display Small</p>
              </div>
              <hr />
              <div class="flex flex-col gap-2">
                <p class="headline large">Headline Large</p>
                <p class="headline medium">Headline Medium</p>
                <p class="headline small">Headline Small</p>
              </div>
              <hr />
              <div class="flex flex-col gap-2">
                <p class="title large">Title Large</p>
                <p class="title medium">Title Medium</p>
                <p class="title small">Title Small</p>
              </div>
              <hr />
              <div class="flex flex-col gap-2">
                <p class="body large">Body Large</p>
                <p class="body medium">Body Medium</p>
                <p class="body small">Body Small</p>
              </div>
              <hr />
              <div class="flex flex-col gap-2">
                <p class="label large">Label Large</p>
                <p class="label medium">Label Medium</p>
                <p class="label small">Label Small</p>
              </div>
              <hr />
              <div class="flex flex-col gap-2">
                <p class="title medium variant">Title Variant (muted/secondary)</p>
                <p class="body medium variant">Body Variant (muted/secondary)</p>
                <p class="label medium variant">Label Variant (muted/secondary)</p>
              </div>
            </article>
          </section>

          {/* Forms Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Forms & Inputs</h2>
              <p>Text inputs, selects, checkboxes, and form fields</p>
            </hgroup>

            <article class="elevated p-6">
              <form class="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form-field class="flex flex-col gap-1">
                    <label>First Name</label>
                    <input-shell>
                      <input type="text" placeholder="John" required />
                    </input-shell>
                    <output></output>
                  </form-field>

                  <form-field class="flex flex-col gap-1">
                    <label>Last Name</label>
                    <input-shell>
                      <input type="text" placeholder="Doe" required />
                    </input-shell>
                    <output></output>
                  </form-field>
                </div>

                <form-field class="flex flex-col gap-1">
                  <label>Email Address</label>
                  <input-shell>
                    <i>mail</i>
                    <input type="email" placeholder="john@example.com" />
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
                </div>

                <div class="flex gap-4 items-center">
                  <form-field class="flex items-center gap-2">
                    <input type="radio" name="plan" id="free" checked />
                    <label for="free">Free</label>
                  </form-field>
                  <form-field class="flex items-center gap-2">
                    <input type="radio" name="plan" id="pro" />
                    <label for="pro">Pro</label>
                  </form-field>
                  <form-field class="flex items-center gap-2">
                    <input type="radio" name="plan" id="enterprise" />
                    <label for="enterprise">Enterprise</label>
                  </form-field>
                </div>

                <footer class="flex gap-2 justify-end">
                  <button class="text" type="reset">Reset</button>
                  <button class="flat" type="submit">Submit</button>
                </footer>
              </form>
            </article>
          </section>

          {/* Lists & Chips Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Lists & Chips</h2>
              <p>Navigation lists, chip sets, and menus</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <article class="outlined flex flex-col gap-4 p-5">
                <h3>Navigation List</h3>
                <ul class="nav flex flex-col gap-1">
                  <li aria-current="page"><a href="#">Dashboard</a></li>
                  <li><a href="#">Analytics</a></li>
                  <li><a href="#">Reports</a></li>
                  <li><a href="#">Settings</a></li>
                </ul>
              </article>

              <article class="outlined flex flex-col gap-4 p-5">
                <h3>Chip List</h3>
                <ul class="chips flex flex-wrap gap-2">
                  <li>TypeScript</li>
                  <li>CSS</li>
                  <li>HTML</li>
                  <li>SolidJS</li>
                  <li>Tailwind</li>
                  <li>LINS</li>
                </ul>
              </article>

              <article class="outlined flex flex-col gap-4 p-5">
                <h3>Plain List</h3>
                <ul class="plain flex flex-col gap-1">
                  <li>Item one with plain styling</li>
                  <li>Item two with plain styling</li>
                  <li>Item three with plain styling</li>
                </ul>
              </article>
            </div>

            {/* Underlined Tabs */}
            <article class="outlined flex flex-col gap-4 p-5">
              <h3>Underlined Tabs</h3>
              <ul role="tablist" class="underlined flex gap-2">
                <li aria-selected="true">Overview</li>
                <li aria-selected="false">Analytics</li>
                <li aria-selected="false">Reports</li>
                <li aria-selected="false">Export</li>
              </ul>
            </article>

            {/* Inset Tabs */}
            <article class="outlined flex flex-col gap-4 p-5">
              <h3>Inset Tabs</h3>
              <ul role="tablist" class="inset flex gap-2">
                <li aria-selected="true">Day</li>
                <li aria-selected="false">Week</li>
                <li aria-selected="false">Month</li>
              </ul>
            </article>
          </section>

          {/* Icons Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Icons</h2>
              <p>Material Symbols icon sizes</p>
            </hgroup>

            <div class="flex items-end gap-6">
              <div class="flex flex-col items-center gap-2">
                <i class="small">home</i>
                <span class="label small variant">Small</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <i class="medium">home</i>
                <span class="label small variant">Medium</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <i class="large">home</i>
                <span class="label small variant">Large</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <i class="xlarge">home</i>
                <span class="label small variant">XLarge</span>
              </div>
            </div>

            <div class="flex gap-3">
              <button class="icon"><i>settings</i></button>
              <button class="icon"><i>favorite</i></button>
              <button class="icon"><i>share</i></button>
              <button class="icon"><i>delete</i></button>
              <button class="icon"><i>more_vert</i></button>
            </div>
          </section>

          {/* Empty States Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Empty States & Loading</h2>
              <p>Skeleton loaders and empty content placeholders</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <article class="outlined flex flex-col gap-3 p-5">
                <h3>Loading Skeleton</h3>
                <empty-state class="skeleton flex flex-col gap-3 p-4" aria-busy="true">
                  <div class="h-4 w-3/4"></div>
                  <div class="h-4 w-1/2"></div>
                  <div class="h-4 w-5/6"></div>
                </empty-state>
              </article>

              <article class="outlined flex flex-col gap-3 p-5">
                <h3>Empty Content</h3>
                <empty-state class="empty flex flex-col items-center gap-4 p-8">
                  <i class="xlarge">inbox</i>
                  <h3>No results found</h3>
                  <p>Try adjusting your search filters.</p>
                </empty-state>
              </article>
            </div>
          </section>

          {/* Dialog Section */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Dialogs & Popovers</h2>
              <p>Modal dialogs and floating menus</p>
            </hgroup>

            <div class="flex gap-3">
              <button class="outlined" onClick={() => {
                (document.getElementById("demo-dialog") as HTMLDialogElement)?.showModal();
              }}>
                Open Dialog
              </button>
            </div>

            <dialog id="demo-dialog">
              <hgroup>
                <h3>Confirm Action</h3>
                <p>This action cannot be undone.</p>
              </hgroup>
              <section class="p-4">
                <p>Are you sure you want to proceed with this action? All changes will be permanent.</p>
              </section>
              <footer class="flex gap-2 justify-end">
                <button class="text" onClick={() => {
                  (document.getElementById("demo-dialog") as HTMLDialogElement)?.close();
                }}>Cancel</button>
                <button class="flat error" onClick={() => {
                  (document.getElementById("demo-dialog") as HTMLDialogElement)?.close();
                }}>Confirm</button>
              </footer>
            </dialog>
          </section>

          {/* Selected/Deselected Cards */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Selection States</h2>
              <p>Cards and elements with selection indicators</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article aria-selected="true" role="button" class="outlined flex flex-col gap-3 p-5">
                <h3>Selected</h3>
                <p>This card is selected (aria-selected="true")</p>
              </article>
              <article aria-selected="false" role="button" class="outlined flex flex-col gap-3 p-5">
                <h3>Deselected</h3>
                <p>This card is deselected (aria-selected="false")</p>
              </article>
              <article role="button" class="outlined flex flex-col gap-3 p-5">
                <h3>Neutral</h3>
                <p>This card has no selection state</p>
              </article>
            </div>
          </section>

          {/* Data Display - Label/Value pairs */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Data Display</h2>
              <p>Label/value pairs and metadata</p>
            </hgroup>

            <article class="outlined p-6">
              <dl class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="flex flex-col gap-1">
                  <dt class="label medium variant">Status</dt>
                  <dd class="label medium">Active</dd>
                </div>
                <div class="flex flex-col gap-1">
                  <dt class="label medium variant">Plan</dt>
                  <dd class="label medium">Enterprise</dd>
                </div>
                <div class="flex flex-col gap-1">
                  <dt class="label medium variant">Members</dt>
                  <dd class="label medium">24</dd>
                </div>
                <div class="flex flex-col gap-1">
                  <dt class="label medium variant">Created</dt>
                  <dd class="label medium">Jan 2024</dd>
                </div>
              </dl>
            </article>
          </section>

          {/* Highlighted Card */}
          <section class="flex flex-col gap-4">
            <hgroup>
              <h2>Highlighted Cards</h2>
              <p>Cards with accent bars</p>
            </hgroup>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <article class="highlighted flex flex-col gap-3 p-5">
                <h3>Important Notice</h3>
                <p>This card has a vertical accent bar via the highlighted variant.</p>
              </article>
              <article class="highlighted accent flex flex-col gap-3 p-5">
                <h3>Feature Update</h3>
                <p>Highlighted with accent colour role applied.</p>
              </article>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default App;
