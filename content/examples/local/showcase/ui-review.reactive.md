<theme name="default">

# UI refinement review

Compare the plot, button contrast, nested tooltips, jump buttons and option feedback below.

## Independent plot scales, square grid

<plot min="0" max="20" label="Savings over twenty years">
$$ y = 50000 + 12000x $$
</plot>

The horizontal range stays near 0–20 while the vertical range covers the savings. Pan and zoom to inspect the square grid.

<plot min="-6.28" max="6.28" label="A regular sine wave">
$$ y = \sin(x) $$
</plot>

## Nested tooltips and truncated labels

<tabs label="Tooltip locations">
<tab label="A very long tab title whose full text should be visible in a tooltip when truncated">
<tooltip text="This full explanation must appear above the tab container without clipping.">Hover or focus this text inside a tab</tooltip>

<card title="Inside a card in a tab">
<tooltip text="A tooltip inside a nested card remains fully visible.">Card tooltip</tooltip>
</card>
</tab>
<tab label="Another long tab title for checking complete overflow text">
Switch back to test the tooltip again.
</tab>
</tabs>

<accordion label="More tooltip locations">
<disclosure label="Tooltip in an accordion" open>
<tooltip text="The accordion must not clip this full explanation.">Accordion tooltip</tooltip>
</disclosure>
</accordion>

<gallery label="Gallery tooltip" item-width="260">
<gallery-item label="First item">
<tooltip text="The gallery edge mask must not fade or clip this tooltip.">Tooltip in a scrollable gallery</tooltip>
</gallery-item>
<gallery-item label="Second item">
Scroll back to the first item to inspect its tooltip.
</gallery-item>
</gallery>

## Buttons and options

<checkbox bind="baseline" label="Checkbox animation reference">

<quiz type="choice" label="Which layout keeps the grid square?" answer="screen" explanation="Choose grid spacing according to the screen scale of each axis.">
<option value="screen">Fit each axis and align screen grid spacing</option>
<option value="units">Always force equal numerical units on both axes</option>
</quiz>

<multi-select bind="checks" label="Review checklist">
<option value="contrast">Readable button text</option>
<option value="tooltip">Complete tooltip text</option>
<option value="motion">Option feedback</option>
</multi-select>

<radio-group bind="choice" label="Radio feedback">
<option value="one">First option</option>
<option value="two">Second option</option>
</radio-group>

<jump to="ui-review-target" appearance="button">Jump to the review summary</jump>

<jump to="ui-review-target" appearance="button" color="#2563eb">Jump button with an authored color</jump>

<anchor id="ui-review-target">

## Review summary

Buttons should share their shape, padding, hover, press and focus treatment. Option changes should be brief and respect reduced-motion settings.
