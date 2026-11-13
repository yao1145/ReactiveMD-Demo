<theme name="sci-fi">

# 轨道前哨站规划

这是一篇由内置**科幻主题**渲染的控制台风格文档。调整人员规模和计费周期，读数、补给路线与标签页会同步更新。

<const name="crewMonths" value="{{ 12 }}">
<computed name="crewMonthly" value="{{ people * (annual ? 80 : 100) }}">
<computed name="crewAnnual" value="{{ crewMonthly * crewMonths }}">
<computed name="crewLoad" value="{{ people >= 8 ? '高负载' : people >= 4 ? '正常' : '最低' }}">

<panel title="前哨站参数">
<slider bind="people" label="人数" initial="2" min="1" max="20">
<toggle bind="annual" label="按年计费">
</panel>

当前人数：**{{ people }}**。

月度总额：**{{ crewMonthly }} USD**。年度总额：**{{ crewAnnual }} USD**。

## 系统读数

<grid>
<card title="人员负载">
负载水平：**{{ crewLoad }}**。主题的直角与冷色调来自 `theme/sci-fi/theme.css`。
</card>
<card title="计费周期">
当前按**{{ annual ? '年' : '月' }}**计费。切换应用主题时，主题的明暗令牌也会一起切换。
</card>
</grid>

## 补给路线

<diagram label="从申请到交付" direction="right">
<node id="request" label="申请">需要 **{{ people }}** 人。</node>
<node id="budget" label="预算">每月 **{{ crewMonthly }} USD**。</node>
<node id="delivery" label="交付" tone="success">年度方案：**{{ crewAnnual }} USD**。</node>
<edge from="request" to="budget" label="批准">
<edge from="budget" to="delivery" label="排期">
</diagram>

## 控制台视图

<tabs label="控制台视图">
<tab label="概览">
这一页的控件都是普通的 Reactive MD 组件。主题声明只改变呈现方式，文档继续使用相同的绑定与计算。
</tab>
<tab label="控件">
<accordion>
<disclosure label="查看关键源码">

```markdown
<theme name="sci-fi">

<slider bind="people" label="人数" initial="2" min="1" max="20">
<toggle bind="annual" label="按年计费">

当前人数：**{{ people }}**。
```

</disclosure>
</accordion>
</tab>
</tabs>

> 主题从 `theme/sci-fi/` 自动发现，因此这篇文档在预览、编辑器和离线导出中会保持一致的外观。
