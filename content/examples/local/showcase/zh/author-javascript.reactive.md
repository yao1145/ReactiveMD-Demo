<!-- reactive-md: local-draft-3 -->
# 作者 JavaScript

先试试集章计数器，再到 **开发者工具 → HTML** 开启 **JavaScript**。脚本会把数量设为 3，并让增加按钮每次加两枚章。减少按钮仍每次减一枚。

<counter bind="stamps" label="印章数" initial="1" min="0" max="20" action-id="stamp-card">

已集 **{{ stamps }}** 枚章。

<javascript>
await rmd.set("stamps", 3);

rmd.handleAction("stamp-card", "increment", async () => {
  const stamps = await rmd.get("stamps");
  await rmd.set("stamps", Math.min(stamps + 2, 20));
});
</javascript>
