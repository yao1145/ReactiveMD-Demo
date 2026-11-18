<!-- reactive-md: local-draft-3 -->

# 工作坊预算

<jump to="budget-details">查看费用估算</jump>

<panel title="预算参数">
<number bind="quantity" label="参与人数" min="1" initial="3">
<slider bind="budget" label="预算上限" min="0" max="500" step="10" initial="100">
</panel>

<computed name="total" value="{{ quantity * 50 }}">

<anchor id="budget-details">

<grid columns="2">
<card title="费用估算">

合计 {{ total }} 元

</card>
<card title="预算">

上限 {{ budget }} 元

</card>
</grid>

<if when="{{ total > budget }}">
<alert tone="warning">

估算超出预算 {{ total - budget }} 元。

</alert>
</if>

## 默认预设中的计数器

<counter label="试算次数">
