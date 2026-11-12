<theme name="default">

# Diagrams and galleries

Hover or focus a node to read its notes. Browse images and cards with the wheel, arrow buttons, keyboard or scrollbar.

<panel title="Research workbench">
<slider bind="samples" label="Samples" min="16" max="80" initial="32" step="1">
<checkbox bind="verified" label="Experimental conditions checked">

## Analysis workflow

Current stage: **{{ step }}**.

<diagram label="From collection to archive" direction="right" bind="step" initial="collect">
<node id="collect" label="Collect samples">
### Start with clear records
Prepare **{{ samples }} samples**, retaining the time and source of each one.
</node>
<node id="validate" label="Validate data">
Check identifiers, units and conditions. Current status: **{{ verified ? 'Checked' : 'Pending' }}**.
</node>
<node id="review" label="Manual review" tone="warning">
Review missing information before analysis.
</node>
<node id="analyze" label="Run analysis">
Keep parameters and record every step.
</node>
<node id="report" label="Prepare report" tone="success">
Include a readable summary and reproducible results.
</node>
<node id="archive" label="Archive records">
Keep the source data beside the final report.
</node>
<edge from="collect" to="validate" label="Import">
<edge from="validate" to="analyze" label="Pass">
<edge from="validate" to="review" label="Missing data">
<edge from="review" to="validate" label="Retry">
<edge from="analyze" to="report" label="Confirm">
<edge from="report" to="archive" label="Complete">
</diagram>

## Image gallery

<gallery label="Research slices" item-width="280">
<gallery-item label="01 · Spectrum">
![Blue spectrum curve](/images/gallery/spectrum.svg)

Find a signal in the background noise.
</gallery-item>
<gallery-item label="02 · Structure">
![Molecular structure](/images/gallery/structure.svg)

Connections reveal the whole structure.
</gallery-item>
<gallery-item label="03 · Field">
![Contour field](/images/gallery/field.svg)

Observe patterns across different scales.
</gallery-item>
<gallery-item label="04 · Wave">
![Purple wave](/images/gallery/wave.svg)

Keep the continuity of change and the rhythm of reading.
</gallery-item>
</gallery>

## Cards and mixed content

<gallery label="Research stages" item-width="300">
<gallery-item label="Collection plan">
<card title="01 / Collect">
Prepare **{{ samples }} samples** with consistent identifiers and units.
</card>
</gallery-item>
<gallery-item label="Quality checks">
<card title="02 / Validate">
Conditions: **{{ verified ? 'Checked' : 'Pending' }}**. This card and the diagram notes update together.
</card>
</gallery-item>
<gallery-item label="Methods and records">
<card title="03 / Analyze">
Retain parameters, methods and versions beside the source data.
</card>
</gallery-item>
<gallery-item label="A card can be followed by an image">
![Contour field](/images/gallery/field.svg)

Images, cards and ordinary Markdown share the same gallery.
</gallery-item>
</gallery>

<accordion label="Long text review">
<disclosure label="Long titles and continuous English text">
<diagram label="A long diagram title remains readable through its full accessible name" direction="down">
<node id="long-a" label="LongUnbrokenNodeTitleForResponsiveTextReview" tone="warning">
ContinuousEnglishTextWithoutAnySpacesForResponsiveTooltipReviewAndWrappingInsideTheViewport
</node>
<node id="long-b" label="A long success-node title wraps across two lines" tone="success">All details remain in the node popover.</node>
<edge from="long-a" to="long-b">
</diagram>
<gallery label="A long gallery title to check spacing between its text and the navigation buttons" item-width="260">
<gallery-item label="LongUnbrokenGalleryCaptionForTextOverflowReview">
<card title="A long card title retains its opening text and an ellipsis">
ContinuousEnglishTextForGalleryOverflowReviewWithoutAnySpacesToForceWrappingInsideTheCard
</card>
</gallery-item>
<gallery-item label="Complete image description">
![Molecular structure](/images/gallery/structure.svg)

Snapped content stays inside the clear area between the edge fades.
</gallery-item>
</gallery>
</disclosure>
</accordion>
</panel>
