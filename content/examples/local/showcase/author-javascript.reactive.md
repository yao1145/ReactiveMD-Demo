<!-- reactive-md: local-draft-3 -->
# Author JavaScript

Try the stamp counter, then turn on **JavaScript** under **Developer tools → HTML**. The script sets the count to 3 and makes the increase button add two stamps. The decrease button still removes one.

<counter bind="stamps" label="Stamps" initial="1" min="0" max="20" action-id="stamp-card">

Stamps collected: **{{ stamps }}**.

<javascript>
await rmd.set("stamps", 3);

rmd.handleAction("stamp-card", "increment", async () => {
  const stamps = await rmd.get("stamps");
  await rmd.set("stamps", Math.min(stamps + 2, 20));
});
</javascript>
