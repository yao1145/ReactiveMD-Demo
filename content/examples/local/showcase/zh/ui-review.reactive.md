<theme name="default">

# UI 修订验收

依次检查函数比例、按钮文字对比度、嵌套提示、跳转按钮和选项动效。

## 函数独立缩放，格线保持正方形

<plot min="0" max="20" label="二十年累计储蓄">
$$ y = 50000 + 12000x $$
</plot>

横轴应接近 0–20，纵轴覆盖储蓄金额。可平移、缩放，检查屏幕格线是否仍为正方形。

<plot min="-6.28" max="6.28" label="常规正弦波">
$$ y = \sin(x) $$
</plot>

## 嵌套提示与长标题

<tabs label="提示位置">
<tab label="这是一个很长的标签页标题，省略后应能通过悬浮提示读取完整文字">
<tooltip text="这段完整说明应显示在标签页容器上方，不受标签页边界裁剪。">悬浮或聚焦标签页里的这段文字</tooltip>

<card title="标签页内的卡片">
<tooltip text="嵌套卡片里的完整说明应正常显示，不被卡片和标签页裁剪。">卡片内提示</tooltip>
</card>
</tab>
<tab label="另一个用于检查长文本省略后完整内容的标签页标题">
切回前一个标签页，再检查提示能否正常打开与关闭。
</tab>
</tabs>

<accordion label="其他提示位置">
<disclosure label="折叠面板里的提示" open>
<tooltip text="折叠面板不应裁剪这段完整说明。">折叠面板内提示</tooltip>
</disclosure>
</accordion>

<gallery label="画廊内提示" item-width="260">
<gallery-item label="第一项">
<tooltip text="画廊边缘虚化不应遮挡或裁剪这段提示内容。">可横向滚动画廊中的提示</tooltip>
</gallery-item>
<gallery-item label="第二项">
滚回第一项，检查提示。
</gallery-item>
</gallery>

## 按钮与选项

<checkbox bind="baseline" label="复选框动效参考">

<quiz type="choice" label="哪种方案可以保持屏幕格线正方形？" answer="screen" explanation="根据各轴的屏幕比例选择格线间距。">
<option value="screen">各轴独立适配，按屏幕间距对齐格线</option>
<option value="units">始终强制两个坐标轴使用相同数值单位</option>
</quiz>

<multi-select bind="checks" label="验收项目">
<option value="contrast">按钮文字清晰</option>
<option value="tooltip">提示完整显示</option>
<option value="motion">选项反馈自然</option>
</multi-select>

<radio-group bind="choice" label="单选反馈">
<option value="one">选项一</option>
<option value="two">选项二</option>
</radio-group>

<jump to="ui-review-target" appearance="button">跳到验收小结</jump>

<jump to="ui-review-target" appearance="button" color="#2563eb">带自定义颜色的跳转按钮</jump>

<anchor id="ui-review-target">

## 验收小结

跳转按钮应与普通按钮保持一致的外框、间距、悬浮、按压和聚焦样式；选项切换应短促，并尊重减少动态效果的系统设置。
