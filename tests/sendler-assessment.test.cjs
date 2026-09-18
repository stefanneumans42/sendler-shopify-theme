const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = readFileSync(path.join(__dirname, '../sections/sendler-assessment.liquid'), 'utf8');
const script = source.match(/{% javascript %}([\s\S]*?){% endjavascript %}/)[1];

// Run the production script, including its rules, selection handlers and results
// renderer. Only expose its closure to this VM; no test hooks ship to customers.
const marker = "  const startScreen = root.querySelector('[data-screen=\"start\"]');";
assert.equal(script.split(marker).length, 2, 'The production test hook must remain unambiguous');
const instrumented = script.replace(marker, `
  globalThis.assessment = {
    questions, buildResults, renderResults, selectOption, questionAnswered,
    setAnswers(value) { answers = value; },
    getAnswers() { return answers; }
  };
${marker}`);

function harness() {
  let focused;
  const events = new Map();
  const scrolls = [];
  function element() {
    const nodes = new Map();
    const classes = new Set();
    let html = '';
    return {
      dataset: {}, style: {}, attributes: {}, children: [], hidden: true,
      listeners: new Map(), textContent: '',
      classList: {
        add: value => classes.add(value),
        remove: value => classes.delete(value),
        contains: value => classes.has(value)
      },
      set innerHTML(value) { html = value; this.children = []; },
      get innerHTML() { return html; },
      querySelector(selector) {
        if (!nodes.has(selector)) nodes.set(selector, element());
        return nodes.get(selector);
      },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      appendChild(child) { this.children.push(child); },
      addEventListener(name, fn) {
        if (!this.listeners.has(name)) this.listeners.set(name, []);
        this.listeners.get(name).push(fn);
      },
      click() { for (const fn of this.listeners.get('click') || []) fn(); },
      focus() { focused = this; },
      getBoundingClientRect() { return { top: 150 }; }
    };
  }
  const root = element();
  const context = vm.createContext({
    document: {
      querySelectorAll: () => [root],
      createElement: element,
      addEventListener: (name, fn) => events.set(name, fn)
    },
    window: { scrollY: 100, scrollTo: value => scrolls.push(value), matchMedia: () => ({ matches: true }) }
  });
  vm.runInContext(instrumented, context, { filename: 'sendler-assessment.production.js' });
  return {
    api: context.assessment, root, events, element, scrolls,
    get focused() { return focused; },
    node: selector => root.querySelector(selector)
  };
}

function answers(overrides = {}) {
  return {
    goals: ['curious'], diet: 'meat_fish', fish: 'fish_2plus', b12_foods: 'most_days',
    sun: 'plenty', fiber: 'high', digestion: 'comfortable_regular', activity: 'sedentary',
    sweat: 'never', sleep: 'good', stress: 'low', supplements: ['none'], safety: ['none'],
    ...overrides
  };
}

function evaluate(overrides = {}) {
  const h = harness();
  h.api.setAnswers(answers(overrides));
  const results = h.api.buildResults();
  return { h, results, get: name => results.find(item => item.name === name) };
}

const personas = [
  ['A', { diet: 'no_animal', b12_foods: 'never', fish: 'fish_never', fiber: 'low' },
    { 'Vitamin B12': 'worth', 'Omega-3 EPA/DHA': 'worth' }],
  ['B', { activity: 'strength_3plus', goals: ['performance'] },
    { 'Creatine Monohydrate': 'worth', 'Electrolyte Powder': 'unnecessary' }],
  ['C', {}, { 'Omega-3 EPA/DHA': 'unnecessary' }],
  ['D', { sun: 'very_little' }, { 'Vitamin D3': 'worth' }],
  ['E', { stress: 'very_high' }, { Ashwagandha: 'worth' }],
  ['F', { stress: 'very_high', safety: ['medication'] }, { Ashwagandha: 'context' }],
  ['G', { fiber: 'very_low', digestion: 'frequently_irregular' }, { 'Psyllium Husk': 'worth' }],
  ['H', { activity: 'cardio_endurance', sweat: 'frequently' }, { 'Electrolyte Powder': 'worth' }],
  ['I', { sleep: 'travel_schedule_disruption' }, { Melatonin: 'worth' }],
  ['J', { sleep: 'poor_overall' }, { Melatonin: 'context' }],
  ['K', { goals: ['metabolic_health'] }, { Berberine: 'context' }],
  ['L', {}, { 'Digestive Enzymes': 'unnecessary' }],
  ['M', { digestion: 'bloating_heaviness' }, { 'Digestive Enzymes': 'context', 'Psyllium Husk': 'unnecessary' }]
];

for (const [id, input, expected] of personas) {
  test(`Persona ${id}: approved production results`, () => {
    const { h, results, get } = evaluate(input);
    assert.equal(results.length, 14);
    for (const [name, status] of Object.entries(expected)) assert.equal(get(name).status, status, name);
    h.api.renderResults();
    const rendered = h.node('[data-results-groups]').children.map(node => node.innerHTML).join('');
    for (const name of Object.keys(expected)) assert.ok(rendered.includes(name));
    if (id === 'A') assert.match(get('Omega-3 EPA/DHA').reason, /fish-derived/);
    if (id === 'D') assert.match(get('Vitamin D3').reason, /cannot determine.*blood test/);
    if (id === 'G') assert.match(get('Psyllium Husk').reason, /not a replacement for vegetables, fruit, legumes and whole grains/);
  });
}

const supplements = ['omega3', 'vitamin_d', 'b12', 'psyllium', 'creatine', 'electrolytes',
  'magnesium', 'melatonin', 'ashwagandha', 'collagen', 'curcumin', 'berberine', 'coq10', 'digestive_enzymes'];

test('Persona N: existing supplements stay covered even with medication/condition flags', () => {
  for (const safety of [['none'], ['medication'], ['medical_condition']]) {
    const { results } = evaluate({ supplements, safety, goals: ['performance', 'stress', 'metabolic_health'] });
    assert.ok(results.every(item => item.status === 'covered'));
  }
});

for (const safety of ['pregnant', 'under_18']) {
  test(`Persona O / global safety stop: ${safety} suppresses every product result`, () => {
    const { h } = evaluate({ safety: [safety], supplements, goals: ['performance'], stress: 'very_high' });
    h.api.renderResults();
    assert.equal(h.node('[data-results-groups]').children.length, 0);
    assert.match(h.node('[data-results-groups]').innerHTML, /No automated supplement recommendations shown/);
    assert.match(h.node('[data-results-notice]').innerHTML, /individualized professional guidance/);
    assert.equal(h.node('[data-results-notice]').hidden, false);
  });
}

for (const safety of ['medication', 'medical_condition']) {
  test(`Safety override: ${safety} covers all six specified products without a goal`, () => {
    const { h, get } = evaluate({ safety: [safety], stress: 'very_high', sleep: 'travel_schedule_disruption' });
    for (const name of ['Ashwagandha', 'Curcumin', 'Berberine', 'Melatonin', 'CoQ10', 'Magnesium Glycinate']) {
      assert.equal(get(name).status, 'context', name);
    }
    h.api.renderResults();
    assert.match(h.node('[data-results-notice]').innerHTML, /medication use or a relevant medical condition/);
  });
}

test('Prefer not to say retains general results and displays the safety note', () => {
  const { h } = evaluate({ safety: ['prefer_not'] });
  h.api.renderResults();
  assert.ok(h.node('[data-results-groups]').children.length > 0);
  assert.match(h.node('[data-results-notice]').innerHTML, /Safety information skipped/);
});

test('Multivitamin adds a notice without marking individual nutrients covered', () => {
  const { h, get } = evaluate({ supplements: ['multivitamin'], sun: 'very_little' });
  for (const name of ['Vitamin D3', 'Vitamin B12', 'Magnesium Glycinate']) assert.notEqual(get(name).status, 'covered');
  h.api.renderResults();
  assert.match(h.node('[data-results-notice]').innerHTML, /Check its label/);
});

const boundaries = [
  ['Omega-3 EPA/DHA', [{ fish: 'fish_1' }, 'unnecessary'], [{ fish: 'fish_1', goals: ['heart_healthy_fats'] }, 'could'], [{ fish: 'fish_rare' }, 'worth']],
  ['Vitamin D3', [{}, 'unnecessary'], [{ sun: 'seasonal' }, 'could'], [{ sun: 'some' }, 'could'], [{ sun: 'some', goals: ['basics'] }, 'worth']],
  ['Vitamin B12', [{ b12_foods: 'not_sure' }, 'unnecessary'], [{ diet: 'eggs_dairy', b12_foods: 'few_week' }, 'could'], [{ b12_foods: 'rarely' }, 'could'], [{ diet: 'no_animal', b12_foods: 'most_days' }, 'could'], [{ b12_foods: 'never' }, 'worth']],
  ['Psyllium Husk', [{ fiber: 'not_sure', digestion: 'no_issue' }, 'unnecessary'], [{ fiber: 'not_sure', digestion: 'occasionally_irregular' }, 'could'], [{ fiber: 'low' }, 'could'], [{ fiber: 'low', goals: ['digestion'] }, 'worth']],
  ['Creatine Monohydrate', [{ activity: 'generally_active' }, 'unnecessary'], [{ activity: 'strength_1_2' }, 'could'], [{ activity: 'strength_3plus' }, 'worth']],
  ['Electrolyte Powder', [{ sweat: 'rarely', goals: ['performance'] }, 'unnecessary'], [{ sweat: 'sometimes' }, 'could'], [{ sweat: 'sometimes', activity: 'cardio_endurance' }, 'could'], [{ sweat: 'frequently' }, 'worth']],
  ['Magnesium Glycinate', [{ goals: ['sleep'] }, 'unnecessary'], [{ goals: ['sleep', 'stress'] }, 'could']],
  ['Ashwagandha', [{ stress: 'moderate' }, 'unnecessary'], [{ stress: 'moderate', sleep: 'poor_overall' }, 'could'], [{ stress: 'high' }, 'could'], [{ stress: 'very_high' }, 'worth']],
  ['Collagen', [{ goals: ['performance'], activity: 'strength_3plus' }, 'unnecessary'], [{ goals: ['joints_connective_tissue'] }, 'could']],
  ['Curcumin', [{ goals: ['performance'] }, 'unnecessary'], [{ goals: ['joints_connective_tissue'] }, 'could']],
  ['Melatonin', [{ sleep: 'wake_during_night', goals: ['sleep'] }, 'unnecessary'], [{ sleep: 'trouble_falling_asleep', goals: ['sleep'] }, 'could']]
];

for (const [name, ...cases] of boundaries) {
  test(`Approved thresholds: ${name}`, () => {
    for (const [input, status] of cases) {
      const item = evaluate(input).get(name);
      assert.equal(item.status, status, JSON.stringify(input));
      if (name === 'Psyllium Husk' && ['could', 'worth'].includes(status)) {
        assert.doesNotMatch(item.reason, /do not indicate an obvious/);
        assert.match(item.reason, /not a replacement for vegetables, fruit, legumes and whole grains/);
      }
    }
  });
}

test('Result ceilings remain intact even with every goal selected', () => {
  const goals = harness().api.questions[0].options.map(option => option[0]);
  const { get } = evaluate({ goals, diet: 'inconsistent', fiber: 'very_low', activity: 'strength_3plus', stress: 'very_high' });
  for (const name of ['Magnesium Glycinate', 'Collagen', 'Curcumin']) assert.equal(get(name).status, 'could', name);
  assert.equal(get('Berberine').status, 'context');
  assert.equal(get('CoQ10').status, 'unnecessary');
  assert.equal(get('Digestive Enzymes').status, 'unnecessary');
});

test('All five result categories render, including Probably unnecessary', () => {
  const { h } = evaluate({ sun: 'very_little', goals: ['sleep', 'stress', 'metabolic_health'], supplements: ['creatine'] });
  h.api.renderResults();
  const html = h.node('[data-results-groups]').children.map(node => node.innerHTML).join('');
  for (const label of ['Worth considering', 'Could be useful', 'Needs more context', 'Already covered', 'Probably unnecessary']) {
    assert.ok(html.includes(label), label);
  }
});

test('Unlimited goals and exclusive supplement/safety choices use production selection logic', () => {
  const h = harness();
  const goals = h.api.questions[0];
  for (const [value] of goals.options) h.api.selectOption(goals, value, false);
  assert.equal(h.api.getAnswers().goals.length, 10);
  for (const id of ['supplements', 'safety']) {
    const q = h.api.questions.find(question => question.id === id);
    h.api.selectOption(q, q.options[0][0], false);
    h.api.selectOption(q, 'none', true);
    assert.deepEqual(Array.from(h.api.getAnswers()[id]), ['none']);
    h.api.selectOption(q, q.options[1][0], false);
    assert.deepEqual(Array.from(h.api.getAnswers()[id]), [q.options[1][0]]);
    if (id === 'safety') {
      h.api.selectOption(q, 'prefer_not', true);
      assert.deepEqual(Array.from(h.api.getAnswers()[id]), ['prefer_not']);
    }
  }
});

test('Question navigation, validation, focus, pressed state, back and restart', () => {
  const h = harness();
  h.node('[data-start-assessment]').click();
  h.node('[data-next]').click();
  assert.equal(h.node('[data-validation]').hidden, false);
  assert.equal(h.node('[data-progress]').attributes['aria-valuenow'], '1');
  h.node('[data-question-options]').children[0].click();
  assert.equal(h.focused.attributes['aria-pressed'], 'true');
  h.node('[data-next]').click();
  assert.equal(h.node('[data-progress]').attributes['aria-valuenow'], '2');
  assert.equal(h.focused, h.node('[data-question-title]'));
  h.node('[data-back]').click();
  assert.equal(h.node('[data-question-options]').children[0].attributes['aria-pressed'], 'true');
  h.node('[data-restart]').click();
  assert.equal(Object.keys(h.api.getAnswers()).length, 0);
  assert.equal(h.focused, h.node('[data-start-heading]'));
  assert.ok(h.scrolls.every(scroll => scroll.behavior === 'instant'));
});

test('The production UI completes all 13 screens and focuses results', () => {
  const h = harness();
  h.node('[data-start-assessment]').click();
  const profile = answers();
  for (const question of h.api.questions) {
    const value = Array.isArray(profile[question.id]) ? profile[question.id][0] : profile[question.id];
    h.node('[data-question-options]').children.find(button => button.dataset.value === value).click();
    h.node('[data-next]').click();
  }
  assert.equal(h.focused, h.node('[data-results-heading]'));
  assert.ok(h.node('[data-results-groups]').children.length > 0);
});

test('Theme editor reload initializes a new section without duplicating listeners', () => {
  const h = harness();
  const load = h.events.get('shopify:section:load');
  load({ target: { querySelectorAll: () => [h.root] } });
  assert.equal(h.node('[data-next]').listeners.get('click').length, 1);
  const replacement = h.element();
  load({ target: { querySelectorAll: () => [replacement] } });
  assert.equal(replacement.dataset.assessmentInitialized, 'true');
  assert.equal(replacement.querySelector('[data-next]').listeners.get('click').length, 1);
});

test('FME has no answer transmission, persistence, tracking or AI integration', () => {
  assert.doesNotMatch(script, /\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|dataLayer|gtag|fbq|WebSocket)\b/);
  assert.equal(harness().api.questions.length, 13);
  assert.doesNotMatch(script, /protein|openai/i);
});
