<!-- reactive-md: local-draft-3 -->
<css>
h1 {
  border-block-end: 3px solid #0f766e;
  padding-block-end: 0.35em;
}
</css>

# Author CSS

The opening `<css>` block styles this heading. The slider's `css` attribute sets its width and adds a colored border.

<slider bind="copies" label="Copies" initial="2" min="1" max="12"
        css="max-width: 24rem; border-inline-start: 4px solid #0f766e; padding-inline-start: 1rem">

Print order: **{{ copies }}** copies. Total at 12 USD each: **{{ copies * 12 }} USD**.

Turn off **CSS** under **Developer tools → HTML** and move the slider again. The order total still updates.
