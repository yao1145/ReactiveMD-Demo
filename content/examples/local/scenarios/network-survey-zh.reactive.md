# 周末活动问卷

提交回答后，两个统计面板会同步更新。票数保存在当前运行的本地 Demo 服务中。

<select bind="choice" label="你会参加吗？" initial="yes">
<option value="yes">参加</option>
<option value="no">不参加</option>
</select>
<textarea bind="comment" label="备注" rows="2" max-length="2000">
<submit-button channel="answers" fields="choice comment" label="提交回答">

## 实时统计

两个面板共享一条统计流。隐藏其中一个，另一个仍会收到更新。

<toggle bind="first" label="显示实时计票" initial="true">
<toggle bind="second" label="显示第二块计票板" initial="true">

<if when="{{ first }}">
<survey-tally label="实时计票">
</if>

<if when="{{ second }}">
<survey-tally label="第二块计票板">
</if>
