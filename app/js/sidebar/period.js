// The period filter fields of the Explore filters (sidebar domain): two date fields, "from" and "to".
const PERIOD_OPTS = { modes: ['none', 'exact'], names: { none: 'Any' } }; // the period filter takes unknown ("any") or exact
function initPeriod() {
  $('#fFrom').innerHTML = dfHTML('fl-from', null, PERIOD_OPTS);
  $('#fTo').innerHTML = dfHTML('fl-to', null, PERIOD_OPTS);
}
/** [start, end) of the chosen period, each null when not set. "to 5th century" covers the whole 5th century. */
function periodBounds() {
  const a = dfSafe($('#fFrom .df')),
    b = dfSafe($('#fTo .df'));
  return [a ? dateBounds(a)[0] : null, b ? dateBounds(b)[1] : null];
}
const periodActive = () => periodBounds().some((v) => v !== null);
