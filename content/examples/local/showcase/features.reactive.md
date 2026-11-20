# Repair day

One Saturday, one shared runbook. Set the brief, choose the programme, balance the budget, plan the room, then run the day itself. Every control feeds the same document, so a change in the brief reaches the floor plan and the closing checklist.

<anchor id="top">

<jump to="runbook" appearance="button" color="#2563eb">Skip to the day-of runbook</jump>

<const name="promoHalf" value="{{ 8 }}">
<const name="volunteerSeats" value="{{ 4 }}">
<computed name="visitorSeats" value="{{ capacity - volunteerSeats }}">
<computed name="datesReady" value="{{ signupClose != '' && eventDate != '' }}">
<computed name="registrationInTime" value="{{ datesReady && dateCompare(signupClose, eventDate) <= 0 }}">
<computed name="expectedVisitors" value="{{ round(capacity * promoReach / (promoHalf + promoReach)) }}">
<computed name="promoSpend" value="{{ 20 + promoReach * 6 }}">
<computed name="refreshmentSpend" value="{{ refreshments ? expectedVisitors * 2 : 0 }}">
<computed name="budgetUsed" value="{{ venueCost + materialsCost + promoSpend + refreshmentSpend }}">
<computed name="budgetLeft" value="{{ budgetLimit - budgetUsed }}">
<computed name="deskDistance" value="{{ sqrt(deskX * deskX + deskY * deskY) }}">
<computed name="quietLength" value="{{ quietEnd - quietStart }}">
<computed name="stationCount" value="{{ len(stations) }}">
<computed name="openingDoneCount" value="{{ len(openingDone) }}">
<computed name="openingCompletion" value="{{ openingDoneCount / 4 }}">
<computed name="openingReady" value="{{ openingDoneCount == 4 }}">

## Set the brief

The café borrows a room for one Saturday and runs from ten to three. Decide who signs off the plan, where it happens and how many visitors the room can hold; those answers shape the programme, the budget and the timetable.

<panel title="Event brief">
<input bind="organizer" label="Organizer" initial="Mira" placeholder="Who signs off the plan?">
<choices bind="venue" label="Venue" initial="hall">
<option value="hall">Community hall</option>
<option value="library">Library room</option>
<option value="makerspace">Makerspace</option>
</choices>
<select bind="booking" label="How visitors book" initial="form">
<option value="form">Online form</option>
<option value="dropin">Drop in</option>
<option value="partner">Partner referral</option>
</select>
<date bind="eventDate" label="Event date" initial="2026-11-14">
<date bind="signupClose" label="Registration closes" initial="2026-11-07">
<slider bind="capacity" label="Room capacity" initial="24" min="8" max="60">
<number bind="budgetLimit" label="Spending limit (USD)" initial="900" min="0" max="3000" step="25">
<textarea bind="briefNotes" label="Notes for volunteers" rows="2" placeholder="Anything the team should know before the day?">
<toggle bind="refreshments" label="Serve refreshments" initial="true">
<checkbox bind="guide" label="Print a written repair guide" color="#167875">
<validation when="{{ datesReady && registrationInTime }}" message="Choose both dates and close registration on or before the event." fields="signupClose eventDate">
</panel>

**{{ organizer }}** opens the doors on **{{ eventDate }}** at the {{ venue == 'hall' ? 'community hall' : venue == 'library' ? 'library room' : 'makerspace' }}, with **{{ visitorSeats }}** visitor seats and four volunteer seats.

<badge tone="{{ registrationInTime ? 'success' : 'warning' }}">{{ !datesReady ? 'Choose both dates' : registrationInTime ? 'Registration closes in time' : 'Registration closes too late' }}</badge>

<if when="{{ datesReady }}">
There are **{{ dateDiff(eventDate, signupClose) }}** days between the deadline and the doors opening.
</if>

<if when="{{ booking == 'form' }}">
<alert title="Send a reminder">Email everyone the day before with the address and a request to bring the part that failed if they have it.</alert>
</if>
<if when="{{ booking == 'dropin' }}">
<alert title="Expect an uneven queue">Walk-ins arrive in bursts; keep the <tooltip text="A short conversation that decides which station can help each visitor.">triage</tooltip> desk staffed from the first hour.</alert>
</if>
<if when="{{ booking == 'partner' }}">
<alert title="Confirm referrals">Ask partner organisations for a rough headcount by the Wednesday before the event.</alert>
</if>

<if when="{{ guide }}">
Each visitor leaves with a printed guide, so the <tooltip text="The short list of steps a visitor can repeat at home.">take-home notes</tooltip> should match the repair they received.
</if>

### Copy the opening card

<accordion>
<disclosure label="Show the source for this card">
This block runs on its own; paste it into a fresh document to start any small event plan.

```markdown
<input bind="organizer" label="Organizer" initial="Mira">
<date bind="day" label="Event date" initial="2026-11-14">
<slider bind="capacity" label="Room capacity" initial="24" min="8" max="60">
<computed name="seats" value="{{ capacity - 4 }}">

**{{ organizer }}** opens the doors on **{{ day }}**: {{ seats }} visitor seats, four volunteers and one shared runbook.
```

</disclosure>
</accordion>

## Choose the programme

Volunteers repair what they know. Pick up to three stations; the table below assigns a lead and a preparation task to each one. The learning pace and the triage style decide how the queue moves between benches.

<panel title="Programme">
<multi-select bind="stations" label="Repair stations" max-selected="3" initial="bikes" color="#167875">
<option value="bikes">Bicycles</option>
<option value="electronics">Small electronics</option>
<option value="textiles">Clothing and textiles</option>
<option value="furniture">Wooden furniture</option>
</multi-select>
<radio-group bind="pace" label="Volunteer rhythm" initial="guided">
<option value="guided">Guided repairs with a checklist</option>
<option value="roaming">Roaming help between benches</option>
</radio-group>
<select bind="triage" label="Triage style" initial="paired">
<option value="paired">Pair every visitor with one volunteer</option>
<option value="queue">Keep one queue and call numbers</option>
</select>
<checkbox bind="toolKit" label="Set out a shared tool kit" color="#167875">
</panel>

<data-table label="Station plan" rows="{{ stations }}" key="{{ item }}" max-rows="3">
<column label="Station" value="{{ item == 'bikes' ? 'Bicycles' : item == 'electronics' ? 'Small electronics' : item == 'textiles' ? 'Clothing and textiles' : 'Wooden furniture' }}">
<column label="Lead" value="{{ item == 'bikes' ? 'Sam' : item == 'electronics' ? 'Iris' : item == 'textiles' ? 'Noor' : 'Theo' }}">
<column label="Preparation" value="{{ item == 'electronics' ? 'PAT test the bench and label spare cables' : item == 'textiles' ? 'Thread three machines before doors open' : item == 'furniture' ? 'Clear a dust sheet and clamps' : 'Check stands, pumps and spare tubes' }}">
</data-table>

**{{ stationCount }}** station{{ stationCount == 1 ? '' : 's' }} on the floor. {{ pace == 'guided' ? 'Each lead works from the same checklist, so a visitor can see what happens next.' : 'Leads move between benches; the triage desk keeps track of who is waiting.' }} {{ toolKit ? 'The shared tool kit sits in the middle of the room.' : 'Each station brings its own tools.' }}

<if when="{{ contains(stations, 'electronics') }}">
<alert tone="warning" title="Book the PAT tester">Electronics need a portable appliance test before they reach the bench.</alert>
</if>
<if when="{{ contains(stations, 'textiles') }}">
<alert title="Thread the machines early">Textile repairs stall when three people wait for one working bobbin.</alert>
</if>
<if when="{{ stationCount == 0 }}">
<alert title="Pick at least one station">An empty programme leaves visitors with nothing to join.</alert>
</if>

## Balance the money

Venue, materials, promotion and refreshments share one limit. The turnout curve ties promotion reach to the number of visitors, and the chart, table and totals all read the same numbers.

<panel title="Spending">
<number bind="venueCost" label="Venue (USD)" initial="250" min="0" max="2000" step="10">
<number bind="materialsCost" label="Materials (USD)" initial="120" min="0" max="2000" step="10">
<slider bind="promoReach" label="Promotion reach (hundreds)" initial="12" min="0" max="40">
<validation when="{{ budgetUsed <= budgetLimit }}" message="Spending exceeds the limit by {{ formatCurrency(budgetUsed - budgetLimit, 'USD', 2, 'en-US') }}; trim a cost or raise the limit." fields="budgetLimit venueCost materialsCost promoReach">
</panel>

Spending is **{{ formatCurrency(budgetUsed, 'USD', 2, 'en-US') }}** of the **{{ formatCurrency(budgetLimit, 'USD', 2, 'en-US') }}** limit.

<badge tone="{{ budgetLeft >= 0 ? 'success' : 'warning' }}">{{ budgetLeft >= 0 ? formatCurrency(budgetLeft, 'USD', 2, 'en-US') + ' left' : formatCurrency(-budgetLeft, 'USD', 2, 'en-US') + ' over' }}</badge>

<progress label="Budget used" value="{{ budgetLimit == 0 ? 100 : budgetUsed / budgetLimit * 100 }}" color="#167875">

<if when="{{ budgetUsed > budgetLimit }}">
<alert tone="warning" title="Over budget">Cut **{{ formatCurrency(budgetUsed - budgetLimit, 'USD', 2, 'en-US') }}** before the plan goes to the venue.</alert>
</if>

At **{{ formatNumber(promoReach * 100, 0, 'en-US') }}** flyers, the model expects **{{ expectedVisitors }}** visitors: **{{ formatPercent(expectedVisitors / capacity, 0, 'en-US') }}** of the room. Promotion costs **{{ formatCurrency(promoSpend, 'USD', 2, 'en-US') }}**; refreshments add **{{ formatCurrency(refreshmentSpend, 'USD', 2, 'en-US') }}** for {{ refreshments ? 'the planned cups' : 'nothing, because the switch is off' }}.

<grid columns="2">
<card title="Chart view">
<chart bind="costRow" key="Item" kind="bar" title="Spending by item" y-label="USD">
| Item | Cost |
| --- | ---: |
| Venue | {{ venueCost }} |
| Materials | {{ materialsCost }} |
| Promotion | {{ promoSpend }} |
| Refreshments | {{ refreshmentSpend }} |
</chart>
</card>
<card title="Detail table">
<table bind="costRow" key="Item" initial="Venue" label="Cost detail" page-size="2">
| Item | Cost |
| --- | ---: |
| Venue | {{ venueCost }} |
| Materials | {{ materialsCost }} |
| Promotion | {{ promoSpend }} |
| Refreshments | {{ refreshmentSpend }} |
</table>
</card>
</grid>

The chart and the detail table share one selection: **{{ costRow }}**. Sorting or paging the table does not change the chart.

<plot min="0" max="40" label="Expected turnout against promotion reach" x-label="Promotion reach (hundreds)" y-label="Visitors">
$$ y = \mathrm{capacity}\frac{x}{\mathrm{promoHalf}+x} $$
</plot>

The curve flattens as it approaches the room capacity. Drag the promotion slider and read your place on the curve; doubling the flyers rarely doubles the crowd.

## Lay out the room

The entrance is the origin of a ten-metre square. Put the welcome desk somewhere visible; its walking distance and the quiet window decide how the side room gets used.

<anchor id="layout">

<panel title="Welcome desk">
<coordinate label="Desk position (metres)" bind-x="deskX" bind-y="deskY" initial-x="3" initial-y="4" x-min="0" x-max="10" y-min="0" y-max="10" step="0.5" color="#2563eb">
</panel>

The desk sits **{{ formatNumber(deskDistance, 1, 'en-US') }}** metres from the entrance. A desk near the door keeps the queue outside and leaves the repair benches free.

<quiz type="number" label="Place the desk at (3, 4). How far is it from the entrance?" answer="5" tolerance="0.01" explanation="Use the Pythagorean theorem: the square root of 3² + 4² is 5.">
</quiz>

<panel title="Quiet hours">
<range-slider label="Quiet room window" bind-start="quietStart" bind-end="quietEnd" initial-start="13" initial-end="15" min="9" max="18" step="1" color="#7c3aed">
</panel>

The side room is quiet for **{{ quietLength }}** hours, from **{{ quietStart }}:00** to **{{ quietEnd }}:00**.

<if when="{{ quietLength >= 2 }}">
<alert tone="success" title="Book the side room">Two hours is enough for listening help and a slow textile repair.</alert>
</if>
<if when="{{ quietLength < 2 }}">
<alert tone="warning" title="Keep the side room short">Use the window for one appointment at a time and move listening help to the foyer.</alert>
</if>

<section color="#45536f">
Keep the entrance clear and mark the desk with a number. <text color="#a2273a">**A visitor should see the queue before joining it.**</text>
</section>

<anchor id="runbook">

## Run the day

The page becomes the runbook. Select a stop on the visitor route, work through the opening sequence, then use the checklist, timer and timetable while the doors are open.

<diagram bind="stop" initial="checkin" label="Visitor route">
<node id="checkin" label="Welcome: {{ organizer }}">
The desk checks the booking, gives each visitor a number and points to the triage bench.
</node>
<node id="triage" label="Triage: {{ stationCount }} station{{ stationCount == 1 ? '' : 's' }}">
A volunteer asks what is broken, what the visitor has tried and whether the item can stay for an hour.
</node>
<node id="repair" label="Repair: {{ expectedVisitors }}">
The bench decides whether the item leaves fixed, needs a part, or goes home with advice.
</node>
<edge from="checkin" to="triage" label="Queue">
<edge from="triage" to="repair" label="Assign">
</diagram>

Selected stop: **{{ stop == 'checkin' ? 'welcome' : stop == 'triage' ? 'triage' : 'repair' }}**.

<if when="{{ stop == 'checkin' }}">
<alert title="Keep the door moving">Two volunteers at the desk: one greets, one checks the list.</alert>
</if>
<if when="{{ stop == 'triage' }}">
<alert title="Ask three questions">What is broken, what have you tried, and can you leave it for an hour?</alert>
</if>
<if when="{{ stop == 'repair' }}">
<alert tone="success" title="Record the outcome">A short note per repair feeds the closing debrief.</alert>
</if>

### Walk through the opening

<steps label="Opening sequence" bind="openingStep" initial="unlock">
<step label="Unlock and set up" value="unlock">
Open the room, set out the shared tool kit and test every bench before the first visitor arrives.
</step>
<step label="Brief the team" value="brief">
Walk through the route, the triage questions and the quiet-room window.

<counter bind="volunteersBriefed" label="Volunteers briefed" initial="0" min="0" max="12">

<quiz type="choice" label="A visitor arrives with a broken lamp and no booking. Where do they go first?" answer="triage" explanation="Every visitor passes triage before a station, booked or not.">
<option value="triage">The triage bench</option>
<option value="repair">The nearest repair station</option>
<option value="desk">Back to the door</option>
</quiz>
</step>
<step label="Open the doors" value="open">
Start the bench timer for the first repair slot and let the queue in.
</step>
</steps>

Current step: **{{ openingStep == 'unlock' ? 'Unlock and set up' : openingStep == 'brief' ? 'Brief the team' : 'Open the doors' }}**. **{{ volunteersBriefed }}** volunteers have heard the briefing.

<grid columns="2">
<card title="Repair slot">
<timer label="Bench timer" duration="45">
Start the clock when a repair begins. Reset it between visitors.
</card>
<card title="Opening checklist">
<panel title="Before the doors open">
<checklist bind="openingDone" label="Opening checks" color="#167875">
- [x] Set out the tool kit
- [ ] Test the PAT bench
- [ ] Thread the sewing machines
- [ ] Mark the welcome desk
</checklist>

<progress label="Opening readiness" value="{{ openingCompletion * 100 }}" color="#167875">
</panel>
</card>
</grid>

Ready: **{{ openingDoneCount }} / 4**.

<badge tone="{{ openingReady ? 'success' : 'neutral' }}">{{ formatPercent(openingCompletion, 0, 'en-US') }} complete</badge>

<if when="{{ openingReady }}">
<alert tone="success" title="Doors open">Every opening check is done; start the bench timer when the first visitor sits down.</alert>
</if>

<data-table label="Finished opening checks" rows="{{ openingDone }}" key="{{ item }}" max-rows="4">
<column label="Check" value="{{ item == 'item-1' ? 'Set out the tool kit' : item == 'item-2' ? 'Test the PAT bench' : item == 'item-3' ? 'Thread the sewing machines' : 'Mark the welcome desk' }}">
<column label="Why it matters" value="{{ item == 'item-1' ? 'Volunteers stop hunting for tools' : item == 'item-2' ? 'Electronics stay safe to test' : item == 'item-3' ? 'Textile repairs start without a wait' : 'Visitors find the queue' }}">
</data-table>

The checklist panel resets the opening checks; the timer and the volunteer counter keep their own state.

### See the whole session

<timeline title="Saturday timetable">
| Task | Start | Duration | Notes |
| --- | ---: | ---: | --- |
| Set up and brief | 0 | 60 | Benches tested, volunteers briefed |
| Doors open | 60 | 15 | Welcome desk runs the queue |
| Morning repairs | 75 | 120 | Three stations in parallel |
| Lunch | 195 | 45 | Volunteers rotate |
| Afternoon repairs | 240 | 90 | Listening corner in the side room |
| Close and debrief | 330 | 30 | Record outcomes and missing parts |
</timeline>

## Hand over the runbook

Three people read the same page: a visitor deciding whether to come, a volunteer preparing a bench, and the organizer closing the day. Choose a role; each tab keeps its own notes and controls.

<tabs label="Who is reading?">
<tab label="Visitor">
Bring the item, a spare part if you have one, and <tooltip text="A short note about what you have already tried saves time at triage.">a note about what you have tried</tooltip>. Booking is **{{ booking == 'form' ? 'online' : booking == 'dropin' ? 'not required' : 'through a partner' }}**; doors open at ten.

<if when="{{ booking == 'form' }}">
<alert title="Watch the deadline">Registration closes on **{{ signupClose }}**; after that, ask at the door.</alert>
</if>
</tab>
<tab label="Volunteer">
Your bench is ready when the **{{ pace == 'guided' ? 'guided checklist' : 'roaming brief' }}** is done. Read the **{{ stop == 'triage' ? 'triage' : 'welcome' }}** stop, then start the bench timer.

<badge tone="{{ toolKit ? 'success' : 'warning' }}">{{ toolKit ? 'Shared tool kit is out' : 'Bring your own tools' }}</badge>
</tab>
<tab label="Organizer">
The budget has **{{ budgetLeft >= 0 ? formatCurrency(budgetLeft, 'USD', 2, 'en-US') : formatCurrency(-budgetLeft, 'USD', 2, 'en-US') }}** {{ budgetLeft >= 0 ? 'left' : 'overspent' }}, and **{{ expectedVisitors }}** visitors are expected. Check the route and the timetable before unlocking.

<jump to="layout" appearance="link" color="#2563eb">Review the room plan</jump>
<jump to="runbook" appearance="button" color="#2563eb">Return to the runbook</jump>
</tab>
</tabs>

<accordion label="Handover questions">
<disclosure label="What if more visitors arrive than the room allows?" open>
Seats are **{{ visitorSeats }}**; the model expects **{{ expectedVisitors }}**. Hand out timed return slots rather than turning people away, and keep the door count at capacity.
</disclosure>
<disclosure label="When do we cancel a station?">
When a lead cannot come, drop that station from the programme and redistribute its visitors at triage. The station count is **{{ stationCount }}**.
</disclosure>
</accordion>

<alert title="Leave a note for next time">Record missing parts, repairs that needed a second visit and the busiest hour. Next year's brief starts from these notes.</alert>

<jump to="top" appearance="button" color="#2563eb">Back to the brief</jump>
