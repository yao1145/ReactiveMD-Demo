# 社区维修日

一个周六，一份共用的运行手册。先定活动简报，再挑维修项目、平衡预算、布置场地，最后按同一页文档把当天跑完。每个控件都写进同一份文档，所以简报里的改动会一路传到场地平面图和收尾清单。

<anchor id="top">

<jump to="runbook" appearance="button" color="#2563eb">跳到当天运行手册</jump>

<const name="promoHalf" value="{{ 8 }}">
<const name="volunteerSeats" value="{{ 4 }}">
<computed name="visitorSeats" value="{{ capacity - volunteerSeats }}">
<computed name="datesReady" value="{{ signupClose != '' && eventDate != '' }}">
<computed name="registrationInTime" value="{{ datesReady && dateCompare(signupClose, eventDate) <= 0 }}">
<computed name="expectedVisitors" value="{{ round(capacity * promoReach / (promoHalf + promoReach)) }}">
<computed name="promoSpend" value="{{ 150 + promoReach * 45 }}">
<computed name="refreshmentSpend" value="{{ refreshments ? expectedVisitors * 15 : 0 }}">
<computed name="budgetUsed" value="{{ venueCost + materialsCost + promoSpend + refreshmentSpend }}">
<computed name="budgetLeft" value="{{ budgetLimit - budgetUsed }}">
<computed name="deskDistance" value="{{ sqrt(deskX * deskX + deskY * deskY) }}">
<computed name="quietLength" value="{{ quietEnd - quietStart }}">
<computed name="stationCount" value="{{ len(stations) }}">
<computed name="openingDoneCount" value="{{ len(openingDone) }}">
<computed name="openingCompletion" value="{{ openingDoneCount / 4 }}">
<computed name="openingReady" value="{{ openingDoneCount == 4 }}">

## 设定活动简报

维修日借用一间屋子，只办一个周六，从十点开到三点。先定谁来拍板、办在哪里、屋里能容纳多少访客；这些答案会一路决定维修项目、预算和时间表。

<panel title="活动简报">
<input bind="organizer" label="组织者" initial="Mira" placeholder="谁为这份计划拍板？">
<choices bind="venue" label="场地" initial="hall">
<option value="hall">社区礼堂</option>
<option value="library">图书馆活动室</option>
<option value="makerspace">创客空间</option>
</choices>
<select bind="booking" label="访客如何报名" initial="form">
<option value="form">在线表单</option>
<option value="dropin">直接到场</option>
<option value="partner">合作机构转介</option>
</select>
<date bind="eventDate" label="活动日期" initial="2026-11-14">
<date bind="signupClose" label="报名截止" initial="2026-11-07">
<slider bind="capacity" label="场地容量" initial="24" min="8" max="60">
<number bind="budgetLimit" label="支出上限（元）" initial="6500" min="0" max="20000" step="100">
<textarea bind="briefNotes" label="给志愿者的备注" rows="2" placeholder="当天开始前，团队还需要知道什么？">
<toggle bind="refreshments" label="提供茶点" initial="true">
<checkbox bind="guide" label="打印一份带走的维修指南" color="#167875">
<validation when="{{ datesReady && registrationInTime }}" message="请把两个日期都填上，并让报名在活动当天或之前截止。" fields="signupClose eventDate">
</panel>

**{{ organizer }}** 将在 **{{ eventDate }}** 于{{ venue == 'hall' ? '社区礼堂' : venue == 'library' ? '图书馆活动室' : '创客空间' }}开门，现场有 **{{ visitorSeats }}** 个访客席位和四个志愿者席位。

<badge tone="{{ registrationInTime ? 'success' : 'warning' }}">{{ !datesReady ? '请先选择两个日期' : registrationInTime ? '报名按计划截止' : '报名截止得太晚' }}</badge>

<if when="{{ datesReady }}">
从报名截止到开门，中间有 **{{ dateDiff(eventDate, signupClose) }}** 天。
</if>

<if when="{{ booking == 'form' }}">
<alert title="提前发提醒">活动前一天发邮件，写清地址，并请访客尽量带上出故障的那个零件。</alert>
</if>
<if when="{{ booking == 'dropin' }}">
<alert title="做好排队的准备">直接到场的访客会一阵一阵地来；从第一个小时起，<tooltip text="用几句简短对话判断哪位志愿者和哪张工位能帮上这位访客。">分诊</tooltip>台就要有人守着。</alert>
</if>
<if when="{{ booking == 'partner' }}">
<alert title="确认转介人数">请在活动前的周三向合作机构要一个大致人数。</alert>
</if>

<if when="{{ guide }}">
每位访客都会带走一份打印指南，所以<tooltip text="访客回家后可以照着复述的简短步骤。">带回家的说明</tooltip>要和他当天接受的维修对得上。
</if>

### 复制这张开场卡片

<accordion>
<disclosure label="查看这张卡片的源码">
下面这段可以独立运行；把它粘进一篇新文档，就能开始任何小型活动的计划。

```markdown
<input bind="organizer" label="组织者" initial="Mira">
<date bind="day" label="活动日期" initial="2026-11-14">
<slider bind="capacity" label="场地容量" initial="24" min="8" max="60">
<computed name="seats" value="{{ capacity - 4 }}">

**{{ organizer }}** 在 **{{ day }}** 开门：**{{ seats }}** 个访客席位、四名志愿者，以及一份共用的运行手册。
```

</disclosure>
</accordion>

## 选择维修项目

志愿者只修自己熟悉的东西。最多选三个工位；下表会给每个工位安排负责人和准备事项。带教节奏和分诊方式决定队伍在几张工位之间怎么流动。

<panel title="维修项目">
<multi-select bind="stations" label="维修工位" max-selected="3" initial="bikes" color="#167875">
<option value="bikes">自行车</option>
<option value="electronics">小家电</option>
<option value="textiles">衣物与布艺</option>
<option value="furniture">木家具</option>
</multi-select>
<radio-group bind="pace" label="志愿者带教节奏" initial="guided">
<option value="guided">按清单带教</option>
<option value="roaming">在工位之间巡场帮忙</option>
</radio-group>
<select bind="triage" label="分诊方式" initial="paired">
<option value="paired">每位访客配对一名志愿者</option>
<option value="queue">统一排队、叫号</option>
</select>
<checkbox bind="toolKit" label="摆出共用工具箱" color="#167875">
</panel>

<data-table label="工位安排" rows="{{ stations }}" key="{{ item }}" max-rows="3">
<column label="工位" value="{{ item == 'bikes' ? '自行车' : item == 'electronics' ? '小家电' : item == 'textiles' ? '衣物与布艺' : '木家具' }}">
<column label="负责人" value="{{ item == 'bikes' ? 'Sam' : item == 'electronics' ? 'Iris' : item == 'textiles' ? 'Noor' : 'Theo' }}">
<column label="准备" value="{{ item == 'electronics' ? '给工位做 PAT 测试，并给备用线材贴标签' : item == 'textiles' ? '开门前穿好三台缝纫机' : item == 'furniture' ? '铺好防尘布，备齐夹具' : '检查停车架、打气筒和备用内胎' }}">
</data-table>

场上有 **{{ stationCount }}** 个工位。{{ pace == 'guided' ? '每位负责人照着同一份清单带教，访客能看见下一步做什么。' : '负责人会在工位之间走动，由分诊台记录谁还在等。' }}{{ toolKit ? '共用的工具箱摆在屋子中间。' : '各工位自带工具。' }}

<if when="{{ contains(stations, 'electronics') }}">
<alert tone="warning" title="预约 PAT 测试仪">小家电进工位前要先做便携电器安全测试。</alert>
</if>
<if when="{{ contains(stations, 'textiles') }}">
<alert title="早点穿好缝纫机">三台机器里只要有一台没穿好线，布艺工位就会堵住。</alert>
</if>
<if when="{{ stationCount == 0 }}">
<alert title="至少选一个工位">项目空着，访客进门就没有能参加的内容。</alert>
</if>

## 平衡预算

场地、材料、宣传和茶点共用同一个上限。到场曲线把宣传覆盖和访客人数连在一起，图表、明细表和各项总额读的是同一组数字。

<panel title="支出">
<number bind="venueCost" label="场地（元）" initial="1800" min="0" max="12000" step="50">
<number bind="materialsCost" label="材料（元）" initial="900" min="0" max="12000" step="50">
<slider bind="promoReach" label="宣传覆盖（百份）" initial="12" min="0" max="40">
<validation when="{{ budgetUsed <= budgetLimit }}" message="支出已超出上限 {{ formatCurrency(budgetUsed - budgetLimit, 'CNY', 2, 'zh-CN') }}；请削减一项成本，或提高上限。" fields="budgetLimit venueCost materialsCost promoReach">
</panel>

目前支出 **{{ formatCurrency(budgetUsed, 'CNY', 2, 'zh-CN') }}**，上限是 **{{ formatCurrency(budgetLimit, 'CNY', 2, 'zh-CN') }}**。

<badge tone="{{ budgetLeft >= 0 ? 'success' : 'warning' }}">{{ budgetLeft >= 0 ? '还剩 ' + formatCurrency(budgetLeft, 'CNY', 2, 'zh-CN') : '超出 ' + formatCurrency(-budgetLeft, 'CNY', 2, 'zh-CN') }}</badge>

<progress label="预算使用" value="{{ budgetLimit == 0 ? 100 : budgetUsed / budgetLimit * 100 }}" color="#167875">

<if when="{{ budgetUsed > budgetLimit }}">
<alert tone="warning" title="超出预算">把计划交给场地方之前，先砍掉 **{{ formatCurrency(budgetUsed - budgetLimit, 'CNY', 2, 'zh-CN') }}**。</alert>
</if>

发出 **{{ formatNumber(promoReach * 100, 0, 'zh-CN') }}** 份传单时，模型预计会来 **{{ expectedVisitors }}** 位访客，占场地的 **{{ formatPercent(expectedVisitors / capacity, 0, 'zh-CN') }}**。宣传花费 **{{ formatCurrency(promoSpend, 'CNY', 2, 'zh-CN') }}**；茶点{{ refreshments ? '按计划人数' : '已关闭，因此' }}再增加 **{{ formatCurrency(refreshmentSpend, 'CNY', 2, 'zh-CN') }}**。

<grid columns="2">
<card title="图表">
<chart bind="costRow" key="项目" kind="bar" title="各项支出" y-label="元">
| 项目 | 费用 |
| --- | ---: |
| 场地 | {{ venueCost }} |
| 材料 | {{ materialsCost }} |
| 宣传 | {{ promoSpend }} |
| 茶点 | {{ refreshmentSpend }} |
</chart>
</card>
<card title="明细表">
<table bind="costRow" key="项目" initial="场地" label="费用明细" page-size="2">
| 项目 | 费用 |
| --- | ---: |
| 场地 | {{ venueCost }} |
| 材料 | {{ materialsCost }} |
| 宣传 | {{ promoSpend }} |
| 茶点 | {{ refreshmentSpend }} |
</table>
</card>
</grid>

图表和明细表共用同一个选中项：**{{ costRow }}**。给明细表排序或翻页，不会改变图表。

<plot min="0" max="40" label="宣传覆盖与预计到场人数" x-label="宣传覆盖（百份）" y-label="访客">
$$ y = \mathrm{capacity}\frac{x}{\mathrm{promoHalf}+x} $$
</plot>

曲线越接近场地容量就越平。拖动宣传滑块，在曲线上找到当前的位置；传单翻倍，人群通常不会跟着翻倍。

## 布置场地

入口是一个十米见方平面的原点。把接待台放在一眼能看到的地方；它到入口的直线距离和安静时段，决定侧屋怎么用。

<anchor id="layout">

<panel title="接待台">
<coordinate label="接待台位置（米）" bind-x="deskX" bind-y="deskY" initial-x="3" initial-y="4" x-min="0" x-max="10" y-min="0" y-max="10" step="0.5" color="#2563eb">
</panel>

接待台离入口 **{{ formatNumber(deskDistance, 1, 'zh-CN') }}** 米。靠近门口能让队伍留在室外，也给维修工位腾出空间。

<quiz type="number" label="把接待台放在 (3, 4)，它离入口有多远？" answer="5" tolerance="0.01" explanation="用勾股定理：3² + 4² 的平方根是 5。">
</quiz>

<panel title="安静时段">
<range-slider label="静音室开放时段" bind-start="quietStart" bind-end="quietEnd" initial-start="13" initial-end="15" min="9" max="18" step="1" color="#7c3aed">
</panel>

侧屋从 **{{ quietStart }}:00** 到 **{{ quietEnd }}:00** 保持安静，共 **{{ quietLength }}** 小时。

<if when="{{ quietLength >= 2 }}">
<alert tone="success" title="预订侧屋">两个小时够做倾听陪伴，也能让一件布艺活慢慢收尾。</alert>
</if>
<if when="{{ quietLength < 2 }}">
<alert tone="warning" title="缩短侧屋安排">这个时段一次只约一位访客，把倾听陪伴挪到门厅。</alert>
</if>

<section color="#45536f">
入口保持畅通，给接待台标一个号码。<text color="#a2273a">**访客应该先看见队伍，再加入队伍。**</text>
</section>

<anchor id="runbook">

## 当天的运行

这一页现在变成运行手册。点选访客路线上的一个站点，走一遍开场流程，然后在开门期间使用清单、计时器和时间表。

<diagram bind="stop" initial="checkin" label="访客路线">
<node id="checkin" label="迎接：{{ organizer }}">
接待台核对报名、发号码，再把访客指向分诊工位。
</node>
<node id="triage" label="分诊：{{ stationCount }} 个工位">
志愿者问清哪里坏了、自己试过什么、能不能留一个小时。
</node>
<node id="repair" label="维修：{{ expectedVisitors }} 人">
工位判断物件是修好带走、等零件，还是带上建议回家。
</node>
<edge from="checkin" to="triage" label="排队">
<edge from="triage" to="repair" label="分配">
</diagram>

当前站点：**{{ stop == 'checkin' ? '迎接' : stop == 'triage' ? '分诊' : '维修' }}**。

<if when="{{ stop == 'checkin' }}">
<alert title="让门口流动起来">接待台安排两名志愿者：一人招呼，一人核对名单。</alert>
</if>
<if when="{{ stop == 'triage' }}">
<alert title="问三个问题">哪里坏了？你自己试过什么？能不能留一个小时？</alert>
</if>
<if when="{{ stop == 'repair' }}">
<alert tone="success" title="记下结果">每修一件就留一句记录，收尾复盘时用得上。</alert>
</if>

### 走一遍开场流程

<steps label="开场流程" bind="openingStep" initial="unlock">
<step label="开门准备" value="unlock">
开锁、摆出共用工具箱，并在第一位访客到来前测试每张工位。
</step>
<step label="团队简报" value="brief">
一起走一遍访客路线、分诊问题和静音室时段。

<counter bind="volunteersBriefed" label="已听取简报的志愿者" initial="0" min="0" max="12">

<quiz type="choice" label="一位访客拿着坏台灯到场，也没有预约。他先去哪里？" answer="triage" explanation="无论是否预约，每位访客都先经过分诊，再去工位。">
<option value="triage">分诊工位</option>
<option value="repair">最近的维修工位</option>
<option value="desk">回到门口</option>
</quiz>
</step>
<step label="开门迎客" value="open">
为第一个维修时段启动工位计时器，然后放队伍进门。
</step>
</steps>

当前步骤：**{{ openingStep == 'unlock' ? '开门准备' : openingStep == 'brief' ? '团队简报' : '开门迎客' }}**。已有 **{{ volunteersBriefed }}** 位志愿者听过简报。

<grid columns="2">
<card title="维修时段">
<timer label="工位计时器" duration="45">
维修开始时启动。每换一位访客就重置一次。
</card>
<card title="开场清单">
<panel title="开门之前">
<checklist bind="openingDone" label="开场检查" color="#167875">
- [x] 摆出工具箱
- [ ] 测试 PAT 工位
- [ ] 穿好缝纫机
- [ ] 标好接待台
</checklist>

<progress label="开场准备度" value="{{ openingCompletion * 100 }}" color="#167875">
</panel>
</card>
</grid>

已就绪：**{{ openingDoneCount }} / 4**。

<badge tone="{{ openingReady ? 'success' : 'neutral' }}">{{ formatPercent(openingCompletion, 0, 'zh-CN') }} 完成</badge>

<if when="{{ openingReady }}">
<alert tone="success" title="可以开门">开场检查全部完成；第一位访客坐下时启动工位计时器。</alert>
</if>

<data-table label="已完成的开场检查" rows="{{ openingDone }}" key="{{ item }}" max-rows="4">
<column label="检查" value="{{ item == 'item-1' ? '摆出工具箱' : item == 'item-2' ? '测试 PAT 工位' : item == 'item-3' ? '穿好缝纫机' : '标好接待台' }}">
<column label="为什么重要" value="{{ item == 'item-1' ? '志愿者不用到处找工具' : item == 'item-2' ? '小家电测试才安全' : item == 'item-3' ? '布艺维修不用先排队等机器' : '访客能找到队伍' }}">
</data-table>

清单面板的重置按钮会恢复开场检查；计时器和志愿者计数器在面板之外，各自保留状态。

### 看清一整天的安排

<timeline title="周六时间表">
| 事项 | 开始 | 时长 | 说明 |
| --- | ---: | ---: | --- |
| 布置与简报 | 0 | 60 | 测试工位，给志愿者做简报 |
| 开门迎接 | 60 | 15 | 接待台开始放行队伍 |
| 上午维修 | 75 | 120 | 三个工位并行 |
| 午餐 | 195 | 45 | 志愿者轮流休息 |
| 下午维修 | 240 | 90 | 静音室安排倾听陪伴 |
| 收尾复盘 | 330 | 30 | 记录结果和缺少的零件 |
</timeline>

## 交接这份手册

同一页文档有三种读者：决定来不来的访客、准备工位的志愿者，以及收尾的组织者。选择一个角色；每个标签页保留自己的说明和控件。

<tabs label="谁在读这份文档？">
<tab label="访客">
带上要修的物件、能配上的备件，以及<tooltip text="写一句自己已经试过什么，分诊会快很多。">你试过哪些办法</tooltip>。报名方式是**{{ booking == 'form' ? '在线表单' : booking == 'dropin' ? '无需报名' : '合作机构转介' }}**；十点开门。

<if when="{{ booking == 'form' }}">
<alert title="留意截止日期">报名在 **{{ signupClose }}** 截止；之后再想参加，请到门口询问。</alert>
</if>
</tab>
<tab label="志愿者">
**{{ pace == 'guided' ? '带教清单' : '巡场简报' }}**完成后，你的工位就准备好了。先读**{{ stop == 'triage' ? '分诊' : '迎接' }}**站，再启动工位计时器。

<badge tone="{{ toolKit ? 'success' : 'warning' }}">{{ toolKit ? '共用工具箱已摆出' : '请自带工具' }}</badge>
</tab>
<tab label="组织者">
预算**{{ budgetLeft >= 0 ? '还剩 ' + formatCurrency(budgetLeft, 'CNY', 2, 'zh-CN') : '超出 ' + formatCurrency(-budgetLeft, 'CNY', 2, 'zh-CN') }}**，预计来 **{{ expectedVisitors }}** 位访客。开锁前再核对一遍路线和时间表。

<jump to="layout" appearance="link" color="#2563eb">回看场地布置</jump>
<jump to="runbook" appearance="button" color="#2563eb">回到运行手册</jump>
</tab>
</tabs>

<accordion label="交接时的常见问题">
<disclosure label="来的人比场地容量多怎么办？" open>
访客席位是 **{{ visitorSeats }}** 个，模型预计 **{{ expectedVisitors }}** 人。发分时回场号，比直接劝回更稳妥；同时把门内人数控制在容量以内。
</disclosure>
<disclosure label="什么时候撤掉一个工位？">
负责人来不了时，就把它从项目里去掉，并在分诊台重新分配访客。当前工位数是 **{{ stationCount }}**。
</disclosure>
</accordion>

<alert title="给下一次留个记录">记下缺少的零件、需要二次上门的维修和最忙的时段。下一次的活动简报就从这些记录开始。</alert>

<jump to="top" appearance="button" color="#2563eb">回到活动简报</jump>
