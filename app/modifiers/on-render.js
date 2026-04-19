import { modifier } from 'ember-modifier';

// Fires the callback once on insert and again whenever any positional/named
// argument changes. Use when you want to (re)draw imperative content (e.g. a
// d3 chart) in response to tracked argument updates.
export default modifier(
  function onRender(element, [callback]) {
    callback(element);
  },
  { eager: false },
);
