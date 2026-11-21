<!-- reactive-md: local-draft-3 -->
# Extended HTML

Turn on **Extended HTML** under **Developer tools → HTML** to see a definition list and a self-contained notice embedded with `<iframe srcdoc>`.

<dl>
  <dt>Pickup window</dt>
  <dd>Saturday, 10:00–12:00</dd>
  <dt>What to bring</dt>
  <dd>Your confirmation number</dd>
</dl>

<iframe title="Pickup desk notice" srcdoc="<p>Pickup desk: Room 204.</p>"></iframe>

<toggle bind="reminder" label="Pickup reminder">

Reminder: **{{ reminder ? 'on' : 'off' }}**. Try the switch with Extended HTML on or off.
