# Reactive MD beginner guide

Add controls to Markdown, and the prose, calculations and charts update as the reader changes them. Open the [online Playground](https://yaozi.raricy.com/) and paste an example into the editor to try it in the preview.

This guide uses the current working tree with syntax revision `local-draft-3`. Most sections start with a runnable example, then explain it; network submission needs a host channel, so its working example is the separate Open-air cinema document. The complete tag reference is at the end.

## 1. Your first interactive document

```markdown
# Cost estimate

<panel title="Adjust the plan">
<slider bind="people" label="People" initial="2" min="1" max="20">
<toggle bind="annual" label="Annual billing">
</panel>

People: **{{ people }}**.

Monthly cost: **{{ people * (annual ? 80 : 100) }} USD**.
```

Paste the whole document into the Playground. Drag the slider or switch annual billing on, and the values in the prose update immediately. The panel's reset button restores the controls to their starting values.

The document uses two connection rules:

- `bind="people"` names the control, and `initial="2"` sets its starting value.
- `{{ people }}` reads that name. Expressions such as `people * 100` calculate with it.

`annual ? 80 : 100` is a conditional expression: 80 when the toggle is on, otherwise 100. A `<toggle>` with no `initial` starts off.

Try three changes:

1. Change `initial="2"` to `initial="6"`. The preview starts at the new value.
2. Change `max="20"` to `max="50"`. The slider now reaches farther.
3. Change `label="People"` to `label="Participants"`. This changes only the display text, not the bind name.

## 2. Tags and parameters

Components are written as HTML-like tags in Markdown. Use lowercase tag and attribute names, quote attribute values, and keep attributes in any order.

```markdown
<panel title="Signup">
<slider bind="people" label="People" initial="2" min="1" max="20">
<number bind="people" label="Exact count" min="1" max="20" step="1">
</panel>

Current people: {{ people }}.
```

The slider and number field share the parameter `people`. Dragging the slider updates the number field, and editing the number field moves the slider.

Tags have two forms:

| Form | Example | Rule |
| --- | --- | --- |
| No-body component | `<slider bind="people" label="People">` | No closing tag |
| Body container | `<panel title="Signup">...</panel>` | Requires a closing tag and can nest |

Every input needs a `label`. Add `bind` when other content needs the value. When nothing reads the control, omit `bind`; for example, `<timer label="Focus" duration="60">` still works on its own.

Parameter names use letters, digits and underscores, start with a letter or underscore, and are case-sensitive. `x`, `y`, `pi`, `e` and built-in function names are reserved. Put display text in `label`.

Controls that share a parameter must have the same type. Numeric controls must also match `min`, `max` and `step`, and the parameter gets only one explicit `initial`.

## 3. Constants, variables and arrays

Data comes from three sources:

- **Variables** are created by a control's `bind` and can be changed by the reader.
- **Constants** are fixed values declared with `<const>`.
- **Computed values** are declared with `<computed>` and calculated from variables, constants and expressions.

A variable's type comes from its control: text controls produce strings, numeric controls produce numbers, toggles produce booleans, and multi-select controls produce arrays.

```markdown
<const name="unitPrice" value="{{ 80 }}">
<computed name="total" value="{{ people * unitPrice }}">

<slider bind="people" label="People" initial="3" min="1" max="20">

People: **{{ people }}**, total: **{{ total }}** USD.
```

`const` and `computed` are invisible declarations, each on its own line at document top level, with no closing tag. Both require `name` and a complete `value="{{ expression }}"`.

- `const` holds fixed unit prices, dates, thresholds and other values that do not change for the reader. It can read only other constants and built-in constants such as `pi`.
- `computed` holds intermediate results. It can read controls, constants and other computed values, and prose, charts and conditions can reuse it.
- Declarations can reference values declared later. Names cannot duplicate a control or another declaration.

Arrays hold a group of values. Multi-select and checklist controls produce string arrays. Array literals declare numeric arrays.

```markdown
<const name="fees" value="{{ [100, 20, 5] }}">
<multi-select bind="topics" label="Topics">
<option value="math">Math</option>
<option value="physics">Physics</option>
<option value="chemistry">Chemistry</option>
</multi-select>

First fee: {{ fees[0] }}
Total fees: {{ sum(fees) }}
Selected topics: {{ len(topics) }}
```

Array indexes start at 0, so `fees[0]` is the first item. Negative indexes and integers outside the array return `null`. `len` returns the length of an array or string. `sum`, `average`, `minOf` and `maxOf` work on numeric arrays. `contains` checks whether an array contains a value.

Arrays cannot be interpolated directly in `{{ }}`. Convert them with `len`, an index or an aggregate function. An array can hold only one type: all numbers or all strings.

## 4. Expressions

Expressions in `{{ }}` run locally. The language does not execute JavaScript, and a document on its own makes no network requests. A host can enable named channels for the optional submit button and for subscriptions; see section 10.

```markdown
<slider bind="people" label="People" initial="2" min="1" max="20">
<toggle bind="annual" label="Annual billing">

Per person per month: **{{ annual ? 80 : 100 }} USD**
Monthly total: **{{ people * (annual ? 80 : 100) }} USD**
Annual total: **{{ people * (annual ? 80 : 100) * 12 }} USD**
```

Common expression forms:

| Category | Syntax | Example |
| --- | --- | --- |
| Numbers and strings | Numeric literals, single- or double-quoted strings | `2`, `0.5`, `'Basic'` |
| Arithmetic | `+ - * / %` | `people * 100` |
| Comparison | `== != < <= > >=` | `people >= 5` |
| Logic | `! && \|\|` | `people > 0 && people < 10` |
| Conditional | `condition ? valueWhenTrue : valueWhenFalse` | `annual ? 80 : 100` |
| Functions | Math, string, date and formatting functions | `round(2.6)`, `len(topics)` |

Rules:

- Use `*` for multiplication; `2x` is not multiplication.
- Conditions must be booleans. Write `people > 0 && people < 10`, not `0 < people < 10`.
- `+` adds two numbers or joins two strings. It does not convert types.
- Comparisons do not convert between strings and numbers.

Common functions work directly in prose:

```markdown
Rounded: {{ round(2.6) }}
Smaller value: {{ min(3, 8) }}
Formatted amount: {{ formatCurrency(1234.5, 'USD', 2, 'en-US') }}
```

`formatCurrency` takes a value, currency code, number of decimal places and locale. `formatNumber`, `formatPercent` and `formatScientific` follow the same pattern.

Division by zero, a type error or a non-finite result shows "Unable to calculate" in that spot while other content keeps updating. In a Markdown table, escape logical OR `||` as `\|\|`.

## 5. Input controls

Choose a control by the type of value the reader provides:

| Need | Controls | Value |
| --- | --- | --- |
| Short or multiline text | `input`, `textarea` | String |
| Exact number, adjustable range or stepper | `number`, `slider`, `counter` | Number |
| On/off or checked state | `toggle`, `checkbox` | Boolean |
| Date | `date` | `YYYY-MM-DD` string, or empty |
| One option | `select`, `choices`, `radio-group` | Selected option's string value |
| Several options | `multi-select` | Array of selected values |

```markdown
<input bind="name" label="Name" placeholder="What should we call you?">
<textarea bind="notes" label="Notes" initial="Bring a camera" rows="3">
<date bind="day" label="Workshop date" initial="2026-10-26">
<number bind="quantity" label="Quantity" initial="3" min="1" max="20">
<toggle bind="gift" label="Gift box">
<choices bind="plan" label="Plan">
<option value="basic">Basic</option>
<option value="pro">Pro</option>
</choices>

Hello, {{ name == '' ? 'guest' : name }}.
You chose the {{ plan == 'basic' ? 'Basic' : 'Pro' }} plan: {{ quantity }} items on {{ day }}.
```

When `initial` is omitted, defaults differ by control:

- `input` and `textarea` start empty; an empty `date` means no date has been selected.
- `number` and `counter` use the closest valid value to 0; `slider` uses `min`.
- `toggle` and `checkbox` start as `false`.
- `select`, `choices` and `radio-group` select the first option.

`number` and `slider` use `min`, `max` and `step` to limit the value and step size. `counter` includes decrease, increase and reset buttons. `textarea` takes its text in `initial`, not in a body.

An `option`'s `value` is the value exposed to expressions; the label text is display only. Set `initial` to an option's `value` to choose a different default.

`multi-select` requires `label`, and `max-selected` limits how many options the reader can choose. `checklist` uses `[ ]` and `[x]` for initial states and exposes an array of checked item IDs.

Use `range-slider` for a range and `coordinate` for a two-dimensional point. They expose two numbers through `bind-start`/`bind-end` and `bind-x`/`bind-y`.

## 6. Charts and function curves

### Charts

A chart reads a Markdown table. Put labels in the first column and write numeric cells as plain numbers or complete `{{ expressions }}`.

```markdown
<slider bind="people" label="People" initial="2" min="1" max="20">

<chart kind="bar" title="Monthly cost" y-label="USD">
| Plan | Cost |
| --- | ---: |
| Basic | {{ people * 20 }} |
| Pro | {{ people * 35 }} |
</chart>
```

`kind` defaults to `bar` and also accepts `line`, `area`, `scatter` and `donut`. Put units in `y-label` or the header; cells contain numbers only.

Charts update automatically. For search, sorting and paging, place the same Markdown table inside `<table label="Catalog">...</table>`.

### Function curves

Function curves use LaTeX. Each `$$...$$` block defines one curve in one of four forms: explicit `y = f(x)`, parametric equations, polar coordinates, or an implicit equation.

```markdown
<slider bind="a" label="Amplitude" initial="1" min="0" max="3" step="0.5">

<plot min="-6" max="6" label="Sine curve">
$$ y = a \sin x $$
</plot>
```

Use math parameter names directly in formulas, without `{{ }}`. A single letter maps to the same `bind`, so `a` maps to `bind="a"`. Write a multi-letter parameter as `\mathrm{amplitude}`, which maps to `bind="amplitude"`. `x` and `y` are plot variables; neither can bind to a control.

Parametric equations go in a `cases` block, with `x` and `y` as functions of `t`; `min` and `max` give the range of `t`, and both axes fit the sampled points:

```markdown
<plot min="0" max="12.566" label="Cycloid">
$$ \begin{cases} x = t - \sin t \\ y = 1 - \cos t \end{cases} $$
</plot>
```

Polar curves are written `r = f(\theta)`, with `min` and `max` as the angle range in radians; `θ` and `\theta` are equivalent local angle variables:

```markdown
<plot min="0" max="{{ 2 * pi }}" points="1000" label="Cardioid">
$$ r = 1 + \cos\theta $$
</plot>
```

Any other equation in `x` and `y` is implicit, traced as a contour inside the square region from `min` to `max`, with both axes fitting the trace:

```markdown
<slider bind="a" label="Size" initial="1" min="0.5" max="2" step="0.5">

<plot min="-3" max="3" label="Lemniscate">
$$ (x^2 + y^2)^2 = 2a^2(x^2 - y^2) $$
</plot>
```

`points` sets the sample count as a static integer from 2 to 2000, defaulting to 200; the legacy `samples` attribute still works, and `points` wins when both are set. Implicit equations use `points` as the per-axis grid size (32–100). `min` and `max` accept a complete interpolation.

## 7. Modular layout

Use containers to organize content as it grows. Containers handle layout only; binding and expression rules stay the same.

### tabs and tab

```markdown
<tabs label="Usage notes">
<tab label="How to use">
Drag the slider and the result updates immediately.
</tab>
<tab label="Billing rules">
Annual billing costs 80 USD per person per month; otherwise 100 USD.
</tab>
</tabs>
```

`tabs` divides content into pages and shows the first one by default. `tabs` takes an optional `label`; add `bind` to read the current page. `tab` requires `label`; `value` is optional and generates `tab-1`, `tab-2` in order when omitted. Switching pages keeps the state inside each page.

### grid and card

```markdown
<slider bind="people" label="People" initial="4" min="1" max="12">

<grid columns="2">
<card title="Monthly cost">
**{{ people * 100 }} USD**
</card>
<card title="Annual cost">
**{{ people * 100 * 12 }} USD**
</card>
</grid>
```

`grid` arranges cards in a grid. `columns` is the maximum number of columns, from 1 to 4; the layout uses fewer columns when the container narrows. Direct children of `grid` must be `card`.

`card` is a content card with an optional `title`. Its body continues to use Markdown.

### gallery and gallery-item

```markdown
<number bind="people" label="People" initial="4" min="1" max="12">

<gallery label="Plan comparison" item-width="280">
<gallery-item label="Basic">
For individuals, **{{ people * 80 }} USD per month**.
</gallery-item>
<gallery-item label="Pro">
Includes team collaboration, **{{ people * 120 }} USD per month**.
</gallery-item>
<gallery-item label="Custom">
<card title="Build your own">
Choose the modules you need and price them separately.
</card>
</gallery-item>
</gallery>
```

`gallery` lays content out as a horizontal gallery. `label` is required and becomes the gallery title. `item-width` sets the width of each item from 180 to 480, defaulting to 280; when the container narrows, items keep their width and the gallery scrolls horizontally.

`gallery-item` is one gallery entry. `label` is optional and appears as the item caption. The body continues to use Markdown and can hold images, cards and other components; bindings and expressions inside update as usual. Direct children of `gallery` must be `gallery-item`.

The gallery header shows the visible range and previous/next buttons, with a scrollbar underneath. Drag the scrollbar, scroll the mouse wheel over the gallery, or focus it and use the arrow keys, `Home` or `End`. Static exports arrange every item in a grid and omit the browsing buttons.

### panel

```markdown
<panel title="Cost parameters">
<slider bind="people" label="People" initial="2" min="1" max="20">
<toggle bind="annual" label="Annual billing">
</panel>

Monthly cost: **{{ people * (annual ? 80 : 100) }} USD**.
```

`panel` groups related controls and adds a reset button. Reset applies only inside the panel. In nested panels, an inner reset affects only the inner panel, while an outer reset includes the whole subtree. Set `reset="false"` to hide the reset button.

### div and align

```markdown
<div align="center">

**Weekend photography workshop**

<badge tone="success">Registration open</badge>

</div>
```

`<div align="center">` centers its content. `align` also accepts `left`, `right` and `justify`; values are case-insensitive and surrounding whitespace is ignored. Markdown, interpolation and controls inside the `div` keep working, and nested elements can set their own alignment.

`p` and `h1` through `h6` accept the same static `align` attribute:

```markdown
<p align="right">A right-aligned **Markdown** paragraph.</p>
```

These alignments work in the default mode without enabling CSS or extended HTML. Use the `align` attribute; `style` and event attributes do not run.

## 8. Advanced features

### if and alert

```markdown
<number bind="people" label="People" initial="3" min="1" max="30">

<if when="{{ people >= 5 }}">
<alert tone="success" title="Group discount">
At 5 or more people, you can request group pricing.
</alert>
</if>
```

`if` requires a complete boolean interpolation in `when`, such as `when="{{ people >= 5 }}"`. It shows its content when the condition is true and hides it when false.

`alert` is a callout block. `tone` accepts `info`, `success` or `warning` and defaults to `info`. `title` is optional, and the body continues to use Markdown.

### accordion and disclosure

```markdown
<accordion label="Frequently asked questions">
<disclosure label="Can I get a refund?" open>
Cancel free of charge up to 7 days before the event.
</disclosure>
<disclosure label="What should I bring?">
Bring a laptop and a charger.
</disclosure>
</accordion>
```

`accordion` groups expandable items, useful for FAQs and supplementary details. It contains one or more `disclosure` items and takes an optional `label`.

`disclosure` requires `label`. It starts collapsed; add `open` to expand it initially. Multiple items can be open at the same time, and each item body can contain Markdown and components.

### anchor and jump

```markdown
<jump to="details-target" appearance="button">View details</jump>

<anchor id="details-target">

## Details

This is the jump target.
```

`jump` creates an inline link to a target. Write the target name in `to` without a leading `#`. `appearance` accepts `link` or `button` and defaults to `link`.

`anchor` marks an explicit jump target. `id` is required and must be unique in the document. `jump` can also target an automatically generated heading anchor, such as `to="Details"` for `## Details`; repeated headings get suffixes, so an explicit `anchor` is easier to control. A missing target or duplicate ID is a compile error.

## 9. Other features

### color

```markdown
<slider bind="people" label="People" initial="4" min="1" max="10" color="#2563eb">

<section color="#45536f">
Current attendees: **{{ people }}**. <text color="#a2273a">**Please confirm the venue capacity.**</text>
</section>
```

`color` sets an accent color on interactive controls such as `slider`, `toggle`, `checkbox`, `select`, `choices`, `radio-group` and `checklist`; `jump`, `badge` and `progress` also accept `color`. `section` sets the color for a block of text, and `text` sets the color of inline text. Inner colors override outer colors.

Colors are static names or `#RGB` / `#RRGGBB` values. They do not accept expressions, CSS functions or variables.

### badge

```markdown
<slider bind="people" label="People" initial="4" min="1" max="10">

Current <badge>{{ people }} people</badge>, <badge tone="{{ people >= 8 ? 'warning' : 'success' }}">{{ people >= 8 ? 'Needs a larger venue' : 'Venue is suitable' }}</badge>.
```

`badge` is an inline label for status and short markers. `tone` accepts `neutral`, `success` or `warning` and defaults to `neutral`. `tone` can be static or set by a condition.

### tooltip

```markdown
<slider bind="people" label="People" initial="4" min="1" max="10">

At <tooltip text="8 or more people will trigger a venue capacity reminder.">8 people</tooltip> or more, confirm the venue.
```

`tooltip` is an inline explanation and requires `text`. Readers see it on pointer hover or keyboard focus. Use it for a short phrase or name.

## 10. Network submission

A document on its own makes no network requests. A host can open named channels for a document and decide which direction each channel allows: submission, subscription, or both. The document contains only the channel name. Endpoints, request headers, tokens and validation stay in host code.

Network submission needs the optional `reactive-md/plugins/network` package. It adds one tag, `submit-button`:

- `channel` is required and static. It names a channel the host enabled for submission.
- `fields` is required and static. It lists public writable bindings separated by spaces; one click sends their current values as one snapshot. Duplicates, computed values, read-only externals and unknown names fail the whole submission.
- `label` sets the button text. The default is `Submit`.
- `disabled` is an optional dynamic boolean that disables the button while true.

A submit line looks like `<submit-button channel="answers" fields="choice comment" label="Send response">`. The button shows one of four outcomes: submitting, submitted, rejected with a reason, or unconfirmed. An unconfirmed send may have reached the server; pressing the button again with unchanged fields reuses the same key, so a server that deduplicates by key counts the response once. Editing a field starts a new submission. A required field with no value, or a control holding an invalid draft, stops the send and names the field.

Subscription runs in the other direction. The official plugin ships only the submit button; a host or custom component can subscribe to a channel and receive messages the host has validated. A subscription can also update declared `<external>` values through the host mapping; prose, computations and conditions then read the new values while the reader's inputs keep their state. The Open-air cinema example in the Playground shows the full setup: one submit button, two live tally panels and the host channel configuration behind them.

This guide preview has no channel enabled, so a submit button placed here would stay disabled. Use the Open-air cinema example to try a real send and a live subscription.

## Common errors

| Problem | Cause and fix |
| --- | --- |
| A parameter is undeclared | Check the spelling and case of the expression against the `bind`, `const` or `computed` name. |
| Duplicate `initial` | Keep one explicit initial value per shared parameter. |
| Invalid initial number | Keep it within `min` / `max` and on a valid `step`. |
| An `if` condition does not work | Use a complete boolean interpolation such as `when="{{ people >= 5 }}"`. |
| A chart rejects a numeric cell | Write a plain number or a complete interpolation in the cell and move the unit to `y-label` or the header. |
| An array is blank or raises an error | Do not write `{{ topics }}` directly. Use `len`, an index or an aggregate function such as `sum`. |
| Container content escapes | Check closing tags and nesting; containers must close explicitly. |
| A tag or expression displays literally | Check whether it is inside code or escaped. Unknown tags produce fallback warnings. |
| A table breaks at logical OR | Escape the pipe as `\|\|` inside a Markdown table cell. |
| A plot rejects a formula | Check whether the LaTeX is in the computable set and write multi-letter parameters as `\mathrm{name}`. |
| A calculation shows "Unable to calculate" | Check for division by zero, a type mismatch or a non-finite result. Other content still updates. |
| A declaration has no effect | Place `const` and `computed` at document top level and check that the name does not duplicate a control. |
| A submit button stays disabled | The current page has no channel enabled for submission, or the `fields` list is invalid. Open a page whose host configures the channel. |
| A submission is rejected | The host validator refused the payload; check the named field and its current draft. |
| A submission is unconfirmed | The request may have reached the server. Retry with unchanged fields so the same idempotency key is reused. |
| A subscription stays empty | The host has not enabled the channel, or the stream is still connecting. |

Fix the first diagnostic before the later ones. Compile errors block the preview; unknown-tag warnings preserve the affected source; runtime calculation errors affect only the corresponding content.

Use inline code or code fences to show literal tags and expressions. Write `\{{ people }}` for a literal interpolation in prose.

## Complete component reference

The following tables list all 49 tags in the base `local-draft-3` presets, grouped by purpose. A no-body component has no closing tag, a container must close explicitly, an inline component can sit inside a sentence, a child tag belongs inside its parent, and a declaration does not render as interface content.

Most interactive controls support `label`, optional `bind`, optional `initial` and dynamic `disabled`. The tables list the key attributes only. `number`/`slider` and `date` bounds and `required` may use one interpolation, such as `max="{{ rooms * 4 }}"`; narrowing a range keeps the current value and shows a field error instead of clamping it.

### Inputs and choices

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `input` | `label`, `bind`, `initial`, `type=text/email`, `placeholder`, `required`, `min-length`, `max-length` | Single-line text; value is a string |
| `textarea` | `label`, `bind`, `initial`, `placeholder`, `rows=4`, `required`, `min-length`, `max-length` | Multiline text; text goes in `initial` |
| `number` | `label`, `bind`, `initial`, `min`, `max` (both dynamic), `step=1` | Numeric input; default is the closest valid value to 0 |
| `slider` | `label`, `bind`, `initial`, `min=0`, `max=100` (both dynamic), `step=1`, `color` | Slider number; default is `min` |
| `range-slider` | `label`, `bind-start`, `bind-end`, `initial-start`, `initial-end`, `min`, `max`, `step`, `color` | Two numbers forming a range |
| `coordinate` | `label`, `bind-x`, `bind-y`, `initial-x`, `initial-y`, `x-min`, `x-max`, `y-min`, `y-max`, `step`, `color` | Two-dimensional coordinate |
| `toggle` | `label`, `bind`, `initial`, `color` | Toggle; boolean, default `false` |
| `checkbox` | `label`, `bind`, `initial`, `color` | Checkbox; boolean, default `false` |
| `date` | `label`, `bind`, `initial`, `min`, `max`, `required` (all three dynamic) | Date; value is `YYYY-MM-DD` or an empty string |
| `counter` | `label`, `bind`, `initial`, `min=0`, `max`, `step=1` | Number stepper; built-in decrease, increase and reset |
| `select` | `label`, `bind`, `initial`, `color`; child `option` | Dropdown single choice; first option by default |
| `choices` | `label`, `bind`, `initial`, `color`; child `option` | Option-card single choice |
| `radio-group` | `label`, `bind`, `initial`, `color`; child `option` | Radio button group |
| `multi-select` | `label`, `bind`, `initial`, `max-selected`, `color`; child `option` | Multiple choice; value is an array of strings |
| `option` | `value` required; body is display text | Used by `select`, `choices`, `radio-group`, `multi-select` and `quiz` |

### Built-in actions and progress

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `checklist` | `label`, `bind`, `color`; body is a Markdown task list | Checklist; value is an array of checked item IDs |
| `timer` | `label`, `bind`, `duration=60` | Countdown; built-in start, pause and reset; value is remaining seconds |
| `progress` | `label`, `value` required, `max=100`, `color` | Progress bar; `value` can use an expression |

### Content organization

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `panel` | `title`, `reset=true` | Groups controls; resets their state |
| `card` | `title` | Content card; body uses Markdown |
| `grid` | `columns=2` (1–4) | Card grid; direct children must be `card` |
| `gallery` | `label` required, `item-width=280` (180–480) | Horizontal gallery; direct children must be `gallery-item` |
| `gallery-item` | `label` optional | Gallery entry; body supports Markdown, images and components |
| `tabs` | `label`, `bind`, `initial`; child `tab` | Tabs; first tab by default |
| `tab` | `label` required, `value` optional | Tab child; `value` is generated in order when omitted |
| `accordion` | `label`; child `disclosure` | Accordion group |
| `disclosure` | `label` required, `open=false` | Expandable item; multiple items can be open at once |
| `if` | `when` required, complete boolean interpolation | Conditional display; hidden when the condition is false |

### Jumps and text color

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `jump` | `to` required, `appearance=link/button`, `color` | Scrolls to a heading anchor or explicit `anchor` |
| `anchor` | `id` required and unique in the document | Explicit jump target |
| `text` | `color` required | Inline text color |
| `section` | `color` required | Block text color; body continues to parse Markdown |

### Practice and steps

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `quiz` | `type=choice/number`, `label`, `answer`, `explanation`, `tolerance`; choice child `option` | Practice question; does not expose `bind` |
| `steps` | `label`, `bind`, `initial`; child `step` | Step-by-step reading; first step by default |
| `step` | `label` required, `value` optional | Step child; `value` is generated in order when omitted |

### Callouts

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `alert` | `title`, `tone=info/success/warning` | Callout block |
| `badge` | `tone=neutral/success/warning`, `color` | Status label; `tone` can be static or dynamic |
| `tooltip` | `text` required | Inline explanation; shown on hover or keyboard focus |

### Declarations and local data

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `external` | `name`, `type=string/number/boolean/string-array/number-array` required | Top-level read-only host value; read by expressions and computations, never written by the reader |
| `computed` | `name`, `value` required | Top-level computed value; can read controls, constants and other computed values; not rendered |
| `const` | `name`, `value` required | Top-level constant; can read only constants and built-in constants; not rendered |
| `validation` | `when`, `message`, `fields` required | Cross-field validation; shows a message when it fails |
| `data-table` | `label`, `rows`, `key`, `max-rows=100`; child `column` | Generates table rows from a local array; `item` and `index` are available in each row |
| `column` | `label`, `value` required | A `data-table` column; cells output text only |

### Visualizations

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `table` | `label`, `searchable=true`, `sortable=true`, `page-size=10`, `key`, `bind`, `initial` | Enhanced table; body is a Markdown table |
| `chart` | `kind=bar`, `title`, `x`, `y`, `x-label`, `y-label`, `key`, `bind`, `initial` | Chart; body is a Markdown table |
| `plot` | `min=-10`, `max=10`, `points=200`, `label`, `x-label`, `y-label` | Function curves; `$$...$$` blocks accept explicit, parametric, polar and implicit forms |
| `timeline` | `title`, `unit="minutes"` | Timeline; body table uses `Task`, `Start`, `Duration`, with optional `Notes` |
| `diagram` | `label`, `bind`, `initial`, `direction=right/down`; children `node` and `edge` | Interactive diagram |
| `node` | `id` required and unique, `label` required, `tone` can be dynamic | Diagram node |
| `edge` | `from`, `to` required, `label` | Diagram edge |

These 49 tags are the full set for the base presets. `option`, `tab`, `disclosure`, `node`, `edge`, `step` and `column` are structural children; they must appear inside their matching parent and cannot be used alone.

`table` and `chart` require `key` together with `bind` or `initial`; `key` identifies the selected row. Each `$$...$$` block in a `plot` defines one curve, with up to 16 curves per plot.

In addition, `<theme name="default">` before the body selects the document theme. It is document metadata and is not counted among the 49 tags.

Default mode also supports P0 HTML elements such as `div`, `span`, `p` and `h1` through `h6`. Among them, `div`, `p` and `h1` through `h6` accept a static `align` value (`left`, `center`, `right` or `justify`). These are HTML elements, not part of the 49 tags above.

### Optional network component

Network submission adds one official optional tag, installed with `reactive-md/plugins/network`. It works with every base preset and is not part of the 49 tags above.

| Tag | Key attributes | Purpose |
| --- | --- | --- |
| `submit-button` | `channel` required and static; `fields` required and static; `label`; dynamic `disabled` | Send the listed public bindings through a host-enabled channel |

The host owns channel names, endpoints, validation and authorization. See section 10.
