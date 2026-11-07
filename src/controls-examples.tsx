import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { defineLocalComponent } from 'reactive-md/sdk';
import {
  defineReactComponentPackage,
  type LocalComponentContext,
} from 'reactive-md/react';

/* ------------------------------------------------------------------ button lab
   The accepted button acceptance markup lives in an SDK component so the same
   DOM reaches preview, SSR and the offline export. IDs are unchanged. */

export function ButtonLab() {
  return <div className="button-lab" data-button-lab="">
    <p className="button-lab-note">
      Default secondary, single-class variants and local component classes share one document root.
    </p>

    <div className="button-lab-row" data-lab-row="defaults">
      <button id="lab-plain" type="button">Plain button</button>
      <button id="lab-md-button" type="button" className="md-button">md-button compatibility</button>
      <button id="lab-primary" type="button" className="md-button-primary">Primary</button>
      <button id="lab-secondary" type="button" className="md-button-secondary">Secondary</button>
      <button id="lab-quiet" type="button" className="md-button-quiet">Quiet</button>
    </div>

    <div className="button-lab-row" data-lab-row="overrides">
      <button id="lab-width" type="button" className="lab-width-only">Width-only override</button>
      <button id="lab-color" type="button" className="lab-color-only">Color-only override</button>
      <button id="lab-custom" type="button" className="lab-custom md-button-primary" data-rmd-appearance="custom">Custom opt-out</button>
      <button id="lab-custom-disabled" type="button" className="lab-custom" data-rmd-appearance="custom" disabled>Custom disabled</button>
    </div>

    <div className="button-lab-row" data-lab-row="inputs">
      <input id="lab-input-button" type="button" value="Input button" />
      <input id="lab-input-submit" type="submit" value="Input submit" />
      <input id="lab-input-reset" type="reset" value="Input reset" />
      <input id="lab-input-disabled" type="button" value="Input disabled" disabled />
    </div>

    <div className="button-lab-row" data-lab-row="exceptions">
      <button id="lab-disabled" type="button" disabled>Disabled button</button>
      <button id="lab-hidden" type="button" hidden>Hidden button</button>
      <span id="lab-role" role="button" tabIndex={0}>Role button sentinel</span>
    </div>

    <fieldset id="lab-fieldset" className="button-lab-fieldset" disabled>
      <legend>Disabled fieldset <button id="lab-legend-button" type="button">Legend exception</button></legend>
      <button id="lab-fieldset-button" type="button">Fieldset button</button>
      <input id="lab-fieldset-input" type="button" value="Fieldset input" />
    </fieldset>

    <div id="lab-custom-scope" className="lab-custom-scope" data-rmd-appearance="custom">
      <span className="button-lab-note">A custom container does not opt out its descendant buttons.</span>
      <button id="lab-custom-scope-button" type="button">Descendant button</button>
    </div>
  </div>;
}

/* -------------------------------------------------------------- public controls */

const TABS = [
  { id: 'overview', label: 'Overview', body: 'The first panel. Use Left, Right, Home and End while a tab is focused.' },
  { id: 'details', label: 'Details', body: 'The second panel keeps one tab stop and moves focus with the arrow keys.' },
  { id: 'notes', label: 'Notes', body: 'The third panel is reachable from either direction and wraps at the ends.' },
] as const;

const ROWS = [
  { id: 'row-a', name: 'Alpha', value: 12, state: 'Open' },
  { id: 'row-b', name: 'Beta', value: 8, state: 'Open' },
  { id: 'row-c', name: 'Gamma', value: 5, state: 'Closed' },
] as const;

const CHART_POINTS = [
  { x: 48, y: 128 },
  { x: 104, y: 104 },
  { x: 160, y: 116 },
  { x: 216, y: 72 },
  { x: 272, y: 84 },
  { x: 328, y: 44 },
] as const;

const CHART_LINE = CHART_POINTS.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
const CHART_AREA = `${CHART_LINE} L 328 156 L 48 156 Z`;

function chartGrid() {
  return Array.from({ length: 5 }, (_, index) => {
    const y = 36 + index * 30;
    return <line key={`h-${index}`} x1="40" y1={y} x2="336" y2={y} />;
  }).concat(Array.from({ length: 5 }, (_, index) => {
    const x = 48 + index * 70;
    return <line key={`v-${index}`} x1={x} y1="28" x2={x} y2="160" />;
  }));
}

export function ControlsExamples(_context: LocalComponentContext) {
  const [text, setText] = useState('Accessible native field');
  const [number, setNumber] = useState(3);
  const [date, setDate] = useState('2026-11-07');
  const [note, setNote] = useState('This textarea accepts typed input.');
  const [select, setSelect] = useState('beta');
  const [multi, setMulti] = useState<string[]>(['alpha', 'gamma']);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('compact');
  const [switched, setSwitched] = useState(true);
  const [range, setRange] = useState(62);
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(2);
  const [menuAction, setMenuAction] = useState('Choose an action');
  const [menuIndex, setMenuIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['row-b']));
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveTab = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const toggleRow = (id: string) => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return <div className="examples-root" data-controls-examples="">
    <section className="examples-section" data-example-section="fields">
      <h2>Native fields</h2>
      <p className="examples-note">
        Real native controls keep their pickers, spinners, keyboard behaviour and focus order. The classes only supply look.
      </p>
      <div className="examples-grid">
        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-text">Text field <span className="md-required" aria-hidden="true">*</span></label>
          <input
            id="ex-text"
            className="md-text-input"
            type="text"
            value={text}
            required
            aria-describedby="ex-text-hint"
            onChange={event => setText(event.target.value)}
          />
          <span id="ex-text-hint" className="md-hint">Type to update the bound value.</span>
        </div>

        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-number">Number</label>
          <input
            id="ex-number"
            className="md-text-input"
            type="number"
            min={0}
            max={10}
            step={1}
            value={number}
            onChange={event => setNumber(Number(event.target.value))}
          />
          <span className="md-hint">Native stepper stays available.</span>
        </div>

        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-date">Date</label>
          <input
            id="ex-date"
            className="md-text-input"
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
          />
        </div>

        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-textarea">Textarea</label>
          <textarea
            id="ex-textarea"
            className="md-textarea"
            rows={3}
            value={note}
            onChange={event => setNote(event.target.value)}
          />
        </div>

        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-select">Select</label>
          <select
            id="ex-select"
            className="md-select-input"
            value={select}
            onChange={event => setSelect(event.target.value)}
          >
            <option value="alpha">Alpha</option>
            <option value="beta">Beta</option>
            <option value="gamma">Gamma</option>
          </select>
        </div>

        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-select-multiple">Multiple select</label>
          <select
            id="ex-select-multiple"
            className="md-select-input"
            multiple
            size={3}
            value={multi}
            onChange={event => setMulti(Array.from(event.target.selectedOptions, option => option.value))}
          >
            <option value="alpha">Alpha</option>
            <option value="beta">Beta</option>
            <option value="gamma">Gamma</option>
          </select>
          <span className="md-hint">Use Ctrl or Shift for multiple values.</span>
        </div>

        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-readonly">Read-only</label>
          <input id="ex-readonly" className="md-text-input" type="text" value="Read-only but focusable" readOnly />
        </div>

        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-disabled">Disabled</label>
          <input id="ex-disabled" className="md-text-input" type="text" value="Disabled field" disabled />
        </div>

        <div className="md-field examples-field" data-state="invalid">
          <label className="md-label" htmlFor="ex-invalid">Invalid field</label>
          <input
            id="ex-invalid"
            className="md-text-input"
            type="text"
            defaultValue=""
            required
            aria-invalid="true"
            aria-describedby="ex-invalid-error"
          />
          <span id="ex-invalid-error" className="md-error" role="alert">Enter a value before continuing.</span>
        </div>
      </div>
    </section>

    <section className="examples-section" data-example-section="choices">
      <h2>Choice, range and status</h2>
      <div className="md-group">
        <span className="md-label">Preferences</span>
        <div className="examples-inline">
          <label className="examples-choice">
            <input
              id="ex-checkbox"
              className="md-checkbox"
              type="checkbox"
              checked={checked}
              onChange={event => setChecked(event.target.checked)}
            />
            Checkbox
          </label>
          <label className="examples-choice">
            <input
              id="ex-radio-compact"
              className="md-radio"
              type="radio"
              name="ex-density"
              value="compact"
              checked={radio === 'compact'}
              onChange={() => setRadio('compact')}
            />
            Radio compact
          </label>
          <label className="examples-choice">
            <input
              id="ex-radio-comfortable"
              className="md-radio"
              type="radio"
              name="ex-density"
              value="comfortable"
              checked={radio === 'comfortable'}
              onChange={() => setRadio('comfortable')}
            />
            Radio comfortable
          </label>
          <label className="examples-choice">
            <input
              id="ex-switch"
              className="md-switch"
              type="checkbox"
              role="switch"
              checked={switched}
              onChange={event => setSwitched(event.target.checked)}
            />
            Switch
          </label>
        </div>
      </div>

      <div className="examples-grid">
        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-range">Range <output id="ex-range-output" htmlFor="ex-range">{range}</output></label>
          <input
            id="ex-range"
            className="md-range"
            type="range"
            min={0}
            max={100}
            value={range}
            onChange={event => setRange(Number(event.target.value))}
          />
        </div>
        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-progress">Progress</label>
          <progress id="ex-progress" className="md-progress" value={range} max={100}>{range}%</progress>
        </div>
        <div className="md-field examples-field">
          <label className="md-label" htmlFor="ex-meter">Meter</label>
          <meter id="ex-meter" className="md-meter" value={64} min={0} max={100} low={33} high={66} optimum={84}>64%</meter>
        </div>
      </div>
    </section>

    <section className="examples-section" data-example-section="disclosure">
      <h2>Disclosure and overlays</h2>
      <details id="ex-details" className="md-disclosure">
        <summary className="md-disclosure-title">Show supporting details</summary>
        <div className="md-disclosure-panel">
          Native summary toggles the panel. No script is required for this behaviour.
        </div>
      </details>

      <div className="examples-inline">
        <button
          id="ex-dialog-open"
          type="button"
          className="md-button-primary"
          onClick={() => dialogRef.current?.showModal()}
        >
          Open native dialog
        </button>
        <button
          id="ex-popover-trigger"
          type="button"
          className="md-button-secondary"
          popoverTarget="ex-popover"
        >
          Toggle native popover
        </button>
      </div>

      <dialog id="ex-dialog" className="md-dialog" ref={dialogRef} aria-labelledby="ex-dialog-title">
        <form method="dialog" className="examples-dialog-form">
          <h3 id="ex-dialog-title" className="md-dialog-title">Native modal dialog</h3>
          <p className="md-dialog-body">
            This uses <code>showModal()</code>. Escape closes it with the browser's own focus return.
          </p>
          <div className="examples-inline">
            <button id="ex-dialog-close" type="submit" className="md-button-primary" value="close">Close</button>
          </div>
        </form>
      </dialog>

      <div id="ex-popover" className="md-popover" popover="auto">
        <strong>Native popover</strong>
        <p>Light dismiss, Escape and the trigger button all use the platform implementation.</p>
      </div>
    </section>

    <section className="examples-section" data-example-section="surfaces">
      <h2>Surfaces and feedback</h2>
      <div className="examples-grid">
        <div className="md-card">
          <div className="md-card-title">Card title</div>
          <div className="md-card-body">Cards group related content without owning interaction.</div>
        </div>
        <div className="md-panel">
          <div className="md-panel-title">Panel title</div>
          <div className="md-panel-body">Panels use the same tokens with a lighter edge.</div>
        </div>
        <fieldset className="md-group">
          <legend>Group</legend>
          <p>Fieldsets stay a semantic grouping; the class only supplies appearance.</p>
        </fieldset>
      </div>

      <div className="examples-inline">
        <span className="md-badge md-badge-neutral">Neutral</span>
        <span className="md-badge md-badge-success">Success</span>
        <span className="md-badge md-badge-warning">Warning</span>
        <span className="md-badge md-badge-danger">Danger</span>
        <span className="md-badge md-badge-info">Info</span>
      </div>

      <div className="examples-inline">
        <span className="md-status md-status-success" role="status">Online</span>
        <span className="md-status md-status-warning" role="status">Degraded</span>
        <span className="md-status md-status-danger" role="status">Offline</span>
        <span className="md-status md-status-info" role="status">Syncing</span>
      </div>

      <div className="examples-grid">
        <div className="md-alert md-alert-success" role="status">
          <div className="md-alert-title">Saved</div>
          <div className="md-alert-body">Your local changes are stored.</div>
        </div>
        <div className="md-alert md-alert-warning" role="alert">
          <div className="md-alert-title">Check the date</div>
          <div className="md-alert-body">The selected range crosses a month boundary.</div>
        </div>
        <div className="md-alert md-alert-danger" role="alert">
          <div className="md-alert-title">Export failed</div>
          <div className="md-alert-body">The document has an unresolved reference.</div>
        </div>
        <div className="md-alert md-alert-info" role="status">
          <div className="md-alert-title">Local only</div>
          <div className="md-alert-body">No request leaves this page.</div>
        </div>
      </div>

      <div className="md-empty-state">
        <div className="md-empty-state-title">No results</div>
        <div className="md-empty-state-description">Adjust the filter to show rows.</div>
      </div>

      <div className="examples-inline">
        <span className="md-spinner" role="status" aria-label="Loading"></span>
        <span className="md-loading" role="status">Loading preview</span>
        <div className="md-skeleton" aria-hidden="true"></div>
      </div>
    </section>

    <section className="examples-section" data-example-section="navigation">
      <h2>Tabs, pagination and steps</h2>
      <div className="md-tabs">
        <div className="md-tablist" role="tablist" aria-label="Example tabs">
          {TABS.map((item, index) => <button
            key={item.id}
            id={`ex-tab-${index}`}
            ref={element => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            className="md-tab"
            aria-selected={tab === index}
            aria-controls={`ex-tabpanel-${index}`}
            tabIndex={tab === index ? 0 : -1}
            onClick={() => setTab(index)}
            onKeyDown={event => moveTab(event, index)}
          >
            {item.label}
          </button>)}
        </div>
        {TABS.map((item, index) => <div
          key={item.id}
          id={`ex-tabpanel-${index}`}
          className="md-tabpanel"
          role="tabpanel"
          aria-labelledby={`ex-tab-${index}`}
          tabIndex={0}
          hidden={tab !== index}
        >
          {item.body}
        </div>)}
      </div>

      <nav aria-label="Pagination">
        <div className="md-pagination">
          {[1, 2, 3, 4, 5].map(value => <button
            key={value}
            type="button"
            className="md-page"
            aria-current={page === value ? 'page' : undefined}
            data-state={page === value ? 'current' : undefined}
            onClick={() => setPage(value)}
          >
            {value}
          </button>)}
        </div>
      </nav>

      <ol className="md-steps">
        <li className="md-step" data-state="complete"><span className="md-step-marker">1</span>Account</li>
        <li className="md-step" aria-current="step" data-state="current"><span className="md-step-marker">2</span>Profile</li>
        <li className="md-step" data-state="upcoming"><span className="md-step-marker">3</span>Review</li>
      </ol>

      <div className="examples-inline">
        <button id="ex-tooltip-anchor" type="button" className="md-button-quiet" aria-describedby="ex-tooltip">Tooltip anchor</button>
        <span id="ex-tooltip" className="md-tooltip" role="tooltip">Saved locally</span>
      </div>

      <div className="md-menu examples-menu" role="menu" aria-label="Document actions" onKeyDown={event => {
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown' ? (current + 1) % items.length
          : event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
        if (next !== null) { event.preventDefault(); items[next]?.focus(); }
      }}>
        <button type="button" role="menuitem" className="md-menu-item" tabIndex={menuIndex === 0 ? 0 : -1} onFocus={() => setMenuIndex(0)} onClick={() => setMenuAction('Rename selected')}>Rename</button>
        <button type="button" role="menuitem" className="md-menu-item" tabIndex={menuIndex === 1 ? 0 : -1} onFocus={() => setMenuIndex(1)} onClick={() => setMenuAction('Duplicate selected')}>Duplicate</button>
        <div className="md-menu-separator" role="separator"></div>
        <button type="button" role="menuitem" className="md-menu-item" tabIndex={menuIndex === 2 ? 0 : -1} onFocus={() => setMenuIndex(2)} onClick={() => setMenuAction('Delete selected')}>Delete</button>
      </div>
      <p role="status" id="ex-menu-result">{menuAction}</p>
    </section>

    <section className="examples-section" data-example-section="data">
      <h2>Table and chart</h2>
      <div className="examples-table-wrap">
        <table className="md-table md-table-striped">
          <caption>Selected rows keep native table semantics.</caption>
          <thead>
            <tr>
              <th scope="col">Select</th>
              <th scope="col">Name</th>
              <th scope="col">Value</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => {
              const isSelected = selected.has(row.id);
              return <tr
                key={row.id}
                id={`ex-${row.id}`}
                aria-selected={isSelected}
                data-state={isSelected ? 'selected' : undefined}
              >
                <td>
                  <input
                    id={`ex-${row.id}-check`}
                    className="md-checkbox"
                    type="checkbox"
                    checked={isSelected}
                    aria-label={`Select ${row.name}`}
                    onChange={() => toggleRow(row.id)}
                  />
                </td>
                <th scope="row">{row.name}</th>
                <td>{row.value}</td>
                <td>{row.state}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      <figure className="examples-figure">
        <svg className="md-chart examples-chart" viewBox="0 0 360 200" role="img" aria-labelledby="ex-chart-title ex-chart-desc">
          <title id="ex-chart-title">Series and node sample</title>
          <desc id="ex-chart-desc">Two line series, one area series and a small node-edge graph.</desc>
          <g className="md-chart-grid">{chartGrid()}</g>
          <g className="md-chart-axis">
            <line x1="40" y1="160" x2="336" y2="160" />
            <line x1="40" y1="28" x2="40" y2="160" />
            <text x="40" y="178">0</text>
            <text x="328" y="178">6</text>
            <text x="8" y="44">8</text>
            <text x="8" y="156">0</text>
          </g>
          <path className="md-chart-series-area" data-series="3" d={CHART_AREA} fill="currentColor" fillOpacity={0.14} stroke="none" />
          <path className="md-chart-series-line" data-series="1" d={CHART_LINE} fill="none" stroke="currentColor" strokeWidth={2.5} />
          <path className="md-chart-series-line" data-series="2" d="M 48 148 L 104 132 L 160 96 L 216 108 L 272 64 L 328 76" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="5 4" />
          <line className="md-chart-edge" data-series="1" x1="104" y1="104" x2="216" y2="72" stroke="currentColor" strokeWidth={1.5} />
          <g data-series="1">
            <circle className="md-chart-node" cx="104" cy="104" r="4" tabIndex={0} aria-label="Series one node" />
            <circle className="md-chart-node" cx="216" cy="72" r="4" />
          </g>
          <g className="md-chart-legend" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <g key={index} transform={`translate(${48 + index * 36}, 186)`}>
              <rect className="md-chart-legend-swatch" data-series={String(index + 1)} x="-4" y="-5" width="8" height="8" fill="var(--series-color)" />
              <text x="6" y="4" fontSize="8">S{index + 1}</text>
            </g>)}
          </g>
        </svg>
        <figcaption>Series colours map to <code>data-series="1"</code> through <code>"8"</code>.</figcaption>
      </figure>
    </section>

    <section className="examples-section" data-example-section="overrides">
      <h2>Local overrides and custom opt-out</h2>
      <p className="examples-note">
        Ordinary component classes override only the property they name. A custom element opts out of the shared skin while theme variables stay available.
      </p>
      <div className="examples-grid">
        <div id="ex-override-card" className="md-card lab-card-accent">
          <div className="md-card-title">One-property override</div>
          <div className="md-card-body">The card keeps the shared background, radius and padding; its border is overridden locally.</div>
        </div>
        <div className="md-field examples-field lab-field-accent" id="ex-override-field">
          <label className="md-label" htmlFor="ex-override-input">Field accent</label>
          <input id="ex-override-input" className="md-text-input" type="text" defaultValue="Shared field with one local property" />
        </div>
        <div id="ex-custom-alert" className="md-alert md-alert-danger lab-custom-alert" data-rmd-appearance="custom" role="note">
          <div className="md-alert-title">Custom opt-out</div>
          <div className="md-alert-body">This element owns its full appearance. Theme variables remain available to descendants.</div>
          <span id="ex-custom-token" className="lab-custom-token">Token colour sample</span>
        </div>
      </div>
    </section>
  </div>;
}

/* ------------------------------------------------------------------ manifests */

const buttonLabManifest = defineLocalComponent({
  id: 'demo/button-lab',
  name: 'button-lab',
  version: '1.0.0',
  protocol: 'reactive-md-component/v1',
  form: 'leaf',
  props: {},
  structure: { rule: 'none' },
  capabilities: { interactive: true, static: true, ssr: true, offline: true },
  authoring: {
    title: { en: 'Button lab', zh: '按钮实验' },
    description: { en: 'The accepted native button acceptance markup.', zh: '已验收的原生按钮验收标记。' },
    category: 'sample',
    insertText: '<button-lab>',
  },
});

const controlsExamplesManifest = defineLocalComponent({
  id: 'demo/controls-examples',
  name: 'controls-examples',
  version: '1.0.0',
  protocol: 'reactive-md-component/v1',
  form: 'leaf',
  props: {},
  structure: { rule: 'none' },
  capabilities: { interactive: true, static: true, ssr: true, offline: true },
  authoring: {
    title: { en: 'Native and public controls', zh: '原生与公共控件' },
    description: {
      en: 'Fields, choices, overlays, navigation, feedback and data display samples.',
      zh: '字段、选择、浮层、导航、反馈与数据展示示例。',
    },
    category: 'sample',
    insertText: '<controls-examples>',
  },
});

/* Accepted button-lab local rules. They travel with the package so the
   offline export keeps the same override and custom examples. */
export const buttonLabCss = `
.button-lab {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3) 0;
}
.button-lab-note {
  margin: 0;
  color: var(--ink-muted);
  font-size: var(--text-sm);
}
.button-lab-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}
.button-lab-fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin: 0;
  padding: var(--space-3);
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-control);
}
.button-lab-fieldset legend {
  padding-inline: var(--space-1);
  color: var(--ink-muted);
  font-size: var(--text-sm);
}
.lab-width-only {
  width: 220px;
}
.lab-color-only {
  color: var(--success);
}
.lab-custom-scope {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3);
  border: 1px dashed var(--success-line);
  border-radius: var(--radius-control);
}
.lab-custom {
  min-height: 3.25rem;
  padding: 0.5rem 1.125rem;
  background: #16233a;
  border: 2px solid var(--success);
  border-radius: 999px;
  color: #ffffff;
  font: inherit;
  font-weight: var(--weight-semibold);
  cursor: pointer;
  transition:
    background-color 120ms var(--ease-standard),
    transform 120ms var(--ease-standard);
}
.lab-custom:hover:not(:disabled) {
  background: #2d4a75;
}
.lab-custom:active:not(:disabled) {
  background: #0f1b2d;
  transform: translateY(1px);
}
.lab-custom:focus-visible {
  outline: 3px solid var(--success);
  outline-offset: 3px;
}
.lab-custom:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .lab-custom {
    transition: none;
  }
}
`;

/* Example layout only. Shared md-* skins stay in the engine stylesheet. */
export const controlsExamplesCss = `
.examples-root {
  display: grid;
  gap: var(--space-5, 1.5rem);
}
.examples-section {
  display: grid;
  gap: var(--space-3, 0.75rem);
  min-width: 0;
}
.examples-section > h2 {
  margin: 0;
}
.examples-note {
  max-width: 68ch;
  margin: 0;
  color: var(--ink-muted, #667);
}
.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: var(--space-3, 0.75rem);
  min-width: 0;
}
.examples-field {
  min-width: 0;
  max-width: 26rem;
}
.examples-inline {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
  align-items: center;
  min-width: 0;
}
.examples-choice {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-2, 0.5rem);
  align-items: center;
}
.examples-dialog-form {
  display: grid;
  gap: var(--space-3, 0.75rem);
  min-width: min(24rem, 80vw);
}
.examples-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}
.examples-figure {
  min-width: 0;
  margin: 0;
}
.examples-figure figcaption {
  margin-block-start: var(--space-2, 0.5rem);
  color: var(--ink-muted, #667);
  font-size: var(--text-sm, 0.875rem);
}
.examples-chart {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
}
.examples-menu {
  width: min(100%, 16rem);
}

/* Ordinary component class: one property, shared skin retained. */
.lab-card-accent {
  border: 1px solid var(--success, #2f7d4f);
}

/* Ordinary component class: one property, shared field skin retained. */
.lab-field-accent {
  border-inline-start: 3px solid var(--success, #2f7d4f);
  padding-inline-start: var(--space-2, 0.5rem);
}

/* Fully custom element: data-rmd-appearance="custom" opts out of the skin. */
.lab-custom-alert {
  display: grid;
  gap: var(--space-2, 0.5rem);
  padding: var(--space-4, 1rem);
  background: #16233a;
  border: 2px solid var(--success, #2f7d4f);
  border-radius: var(--radius-card, 12px);
  color: #ffffff;
}
.lab-custom-alert .md-alert-title {
  font-weight: var(--weight-semibold, 600);
}
.lab-custom-token {
  color: var(--accent-text, #7bc5a1);
  font-weight: var(--weight-medium, 500);
}

@media (max-width: 480px) {
  .examples-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .examples-field {
    max-width: none;
  }
  .examples-dialog-form {
    min-width: min(20rem, 78vw);
  }
}
`;

/* ------------------------------------------------------------------- packages */

export const buttonLabPackage = defineReactComponentPackage({
  ...buttonLabManifest,
  css: buttonLabCss,
  render: ButtonLab,
  renderStatic: ButtonLab,
});

export const controlsExamplesPackage = defineReactComponentPackage({
  ...controlsExamplesManifest,
  css: controlsExamplesCss,
  render: ControlsExamples,
  renderStatic: ControlsExamples,
});
