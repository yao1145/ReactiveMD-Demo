<theme name="sci-fi">

# Orbital outpost planner

A console-style document rendered by the bundled **sci-fi** theme. Change the crew size and billing cycle; the readings, supply route and tabs update together.

<const name="crewMonths" value="{{ 12 }}">
<computed name="crewMonthly" value="{{ people * (annual ? 80 : 100) }}">
<computed name="crewAnnual" value="{{ crewMonthly * crewMonths }}">
<computed name="crewLoad" value="{{ people >= 8 ? 'High' : people >= 4 ? 'Nominal' : 'Minimal' }}">

<panel title="Outpost parameters">
<slider bind="people" label="People" initial="2" min="1" max="20">
<toggle bind="annual" label="Annual billing">
</panel>

Current headcount: **{{ people }}**.

Monthly total: **{{ crewMonthly }} USD**. Annual total: **{{ crewAnnual }} USD**.

## System readout

<grid>
<card title="Crew load">
Load level: **{{ crewLoad }}**. The theme's square corners and cold palette come from `theme/sci-fi/theme.css`.
</card>
<card title="Billing cycle">
Billing is **{{ annual ? 'annual' : 'monthly' }}**. Switching the app theme also switches the theme's light and dark tokens.
</card>
</grid>

## Supply route

<diagram label="From request to delivery" direction="right">
<node id="request" label="Request">Crew of **{{ people }}**.</node>
<node id="budget" label="Budget">**{{ crewMonthly }} USD** per month.</node>
<node id="delivery" label="Delivery" tone="success">Annual plan: **{{ crewAnnual }} USD**.</node>
<edge from="request" to="budget" label="Approve">
<edge from="budget" to="delivery" label="Schedule">
</diagram>

## Console views

<tabs label="Console views">
<tab label="Overview">
Every control on this page is a normal Reactive MD component. The theme declaration changes presentation only; the document keeps the same bindings and calculations.
</tab>
<tab label="Controls">
<accordion>
<disclosure label="Show the key source">

```markdown
<theme name="sci-fi">

<slider bind="people" label="People" initial="2" min="1" max="20">
<toggle bind="annual" label="Annual billing">

Current headcount: **{{ people }}**.
```

</disclosure>
</accordion>
</tab>
</tabs>

> The theme is auto-discovered from `theme/sci-fi/`, so this document renders the same way in the preview, the editor and an offline export.
