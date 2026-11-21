<!-- reactive-md: local-draft-3 -->
# 扩展 HTML

在 **开发者工具 → HTML** 中开启 **扩展 HTML**，即可看到定义列表，以及用 `<iframe srcdoc>` 嵌入的自包含取件公告。

<dl>
  <dt>取件时间</dt>
  <dd>周六 10:00–12:00</dd>
  <dt>所需凭证</dt>
  <dd>取件确认号</dd>
</dl>

<iframe title="取件处公告" srcdoc="<p>取件处：204 室。</p>"></iframe>

<toggle bind="reminder" label="取件提醒">

提醒：**{{ reminder ? '已开启' : '已关闭' }}**。开启或关闭扩展 HTML 时，都可以操作这个开关。
