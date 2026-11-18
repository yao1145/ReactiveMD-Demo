<!-- reactive-md: local-draft-3 -->

# Workshop budget

<jump to="budget-details">Jump to the estimate</jump>

<panel title="Parameters">
<number bind="quantity" label="Participants" min="1" initial="3">
<slider bind="budget" label="Budget" min="0" max="500" step="10" initial="100">
</panel>

<computed name="total" value="{{ quantity * 50 }}">

<anchor id="budget-details">

<grid columns="2">
<card title="Estimate">

Total {{ total }}

</card>
<card title="Budget">

Limit {{ budget }}

</card>
</grid>

<if when="{{ total > budget }}">
<alert tone="warning">

The estimate exceeds the budget by {{ total - budget }}.

</alert>
</if>

## Counter in the default preset

<counter label="Trial count">
