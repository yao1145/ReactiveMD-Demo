# Weekend meetup survey

Send a response and watch the two results panels update. The local Demo stores votes for this server run.

<select bind="choice" label="Will you join?" initial="yes">
<option value="yes">Yes</option>
<option value="no">No</option>
</select>
<textarea bind="comment" label="Comment" rows="2" max-length="2000">
<submit-button channel="answers" fields="choice comment" label="Send response">

## Live results

Both panels subscribe to the same results stream. Hide one and the other keeps receiving updates.

<toggle bind="first" label="Show live tally" initial="true">
<toggle bind="second" label="Show second tally" initial="true">

<if when="{{ first }}">
<survey-tally label="Live tally">
</if>

<if when="{{ second }}">
<survey-tally label="Second tally">
</if>
