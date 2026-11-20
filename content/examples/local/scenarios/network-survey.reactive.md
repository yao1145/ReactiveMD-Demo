# Open-air cinema on the east lawn

On Saturday 18 July, the Riverside Film Club screens three short films by its members on the east lawn of Willow Park, behind the library. Entry is free, the gate opens at 19:45, and the programme starts at 20:00. The chair order and the steward roster are built from the count on this page.

<badge tone="success">Free entry</badge> <badge>Outdoor lawn, no assigned seats</badge>

## The evening

<timeline title="Saturday 18 July · 19:45–21:55">
| Task | Start | Duration | Notes |
| --- | ---: | ---: | --- |
| Gate and blanket check | 0 | 15 | Programmes and loan blankets at the main gate |
| Welcome and exits | 15 | 5 | Step-free route, lighting, quiet corner |
| Three short films | 20 | 80 | Introduced by the film club |
| Talk with the makers | 100 | 20 | Questions collected on index cards |
| Lights out | 120 | 10 | Stewards walk the lawn for lost items |
</timeline>

## Two plans, one count

The club owns 80 folding chairs, and the count of yes replies decides what gets rented. From 30 to 79 yes replies, the evening runs as planned: the club's own chairs, the main gate, one speaker. Outside that range, the order changes.

<grid columns="2">
<card title="80 yes replies or more">
Rent <tooltip text="The east lawn fits 140 chairs; the club already owns 80.">60 extra chairs</tooltip>, add a speaker at the back of the lawn, and open the north gate at 19:30.
</card>
<card title="Fewer than 30 yes replies">
Move into the library hall, which seats 60, and leave the generator in the shed. The start time stays the same.
</card>
</grid>

## Reply for Saturday

<alert tone="warning" title="The chair order closes on Thursday at 12:00">
The rental office takes the final count then. A reply after that still helps if the evening moves into the hall, but it cannot add a chair to the lawn.
</alert>

One reply per person is enough. Use the comment for the number of seats you need, the gate you will use, or a question for the film club.

<select bind="choice" label="Will you come on 18 July?" initial="yes">
<option value="yes">Yes, I'll be there</option>
<option value="no">No, I can't make it</option>
</select>
<textarea bind="comment" label="Comment" rows="3" max-length="2000" placeholder="For example: three seats, the step-free route, or a question for the club">
<submit-button channel="answers" fields="choice comment" label="Send response">

If the status says the result is unconfirmed, press **Send response** again with the fields unchanged. The retry reuses the same key, so the server counts you once.

<if when="{{ choice == 'no' }}">
If you can't make it, the recap and the next screening date go up on the library noticeboard after the screening.
</if>

## Live count

The stewards keep the phone view in the gate tent, and the projector at the entrance shows the second panel. Both switches start on; turn one off and the other keeps updating. Hide both and the shared stream closes; turn one back on and it reconnects with the current count.

<toggle bind="first" label="Show live tally" initial="true">
<toggle bind="second" label="Show second tally" initial="true">

<if when="{{ first }}">
<survey-tally label="Steward tally">
</if>

<if when="{{ second }}">
<survey-tally label="Entrance projection">
</if>

The stream sends back two numbers, yes and no. Your comment stays with the stored response in this server's memory, never appears in the tally, and is cleared when the Demo server restarts.

## Practical details

<accordion label="Questions for the night">
<disclosure label="What if it rains?">
The club checks the forecast at 16:00 on Saturday and moves the programme into the library hall if the lawn is wet. The hall seats 60, so the count on this page decides how many chairs go inside. The start time does not change.
</disclosure>
<disclosure label="Can I bring children, a blanket or a dog?">
All three are welcome. The far corner of the lawn is kept quiet for children, and a blanket or low chair works better than a folding chair on the grass. Keep dogs on a lead at the back.
</disclosure>
<disclosure label="Is the lawn easy to reach?">
The main gate and the east path are paved. The north gate has a short gravel section, so the step-free route runs through the main gate.
</disclosure>
</accordion>

## After Thursday

The club confirms the plan on Thursday afternoon: lawn or hall, how many chairs, which gate. The notice goes up on the library board, and the gate tent keeps a copy. The count decides what gets ordered.
