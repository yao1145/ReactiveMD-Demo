<!-- reactive-md: local-draft-3 -->
<css>
h1 {
  border-block-end: 3px solid #0f766e;
  padding-block-end: 0.35em;
}
</css>

# 作者 CSS

文首的 `<css>` 给标题加了一条底线。滑块上的 `css` 属性限制控件宽度，并加上一条彩色边框。

<slider bind="copies" label="印数" initial="2" min="1" max="12"
        css="max-width: 24rem; border-inline-start: 4px solid #0f766e; padding-inline-start: 1rem">

印刷 **{{ copies }}** 份，每份 12 元，合计 **{{ copies * 12 }} 元**。

在 **开发者工具 → HTML** 中关闭 **CSS**，再拖动滑块。总价仍会更新。
