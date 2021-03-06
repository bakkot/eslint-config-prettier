"use strict";

const test = require("ava");
const dedent = require("dedent");
const cli = require("../bin/cli");

function invalidJSONMacro(t, input) {
  const result = cli.processString(input);
  t.true(result.stderr.startsWith("Failed to parse JSON:\n"));
  t.is(result.code, 1);
}
invalidJSONMacro.title = (providedTitle, input) =>
  `${providedTitle} Handles invalid JSON: ${input}`.trim();

test(invalidJSONMacro, "a");
test(invalidJSONMacro, '{"rules": {');

function invalidConfigMacro(t, input) {
  const result = cli.processString(input);
  t.is(
    result.stderr,
    `Expected a \`{"rules: {...}"}\` JSON object, but got:\n${input}`
  );
  t.is(result.code, 1);
}
invalidConfigMacro.title = (providedTitle, input) =>
  `${providedTitle} Handles invalid config: ${input}`.trim();

test(invalidConfigMacro, "null");
test(invalidConfigMacro, "true");
test(invalidConfigMacro, "false");
test(invalidConfigMacro, "1");
test(invalidConfigMacro, '"string"');
test(invalidConfigMacro, "[1, true]");

const offPatterns = ["0", '"off"', "[0]", '["off"]', '["off", "never"]'];

const onPatterns = [
  "1",
  "2",
  '"warn"',
  '"error"',
  "[1]",
  "[2]",
  '["warn"]',
  '["error"]',
  '["error", "never"]'
];

function createRules(rules, value) {
  const rulesString = rules.map(rule => `"${rule}": ${value}`).join(", ");
  return `{"rules": {${rulesString}}}`;
}

function offRulesMacro(t, rules) {
  offPatterns.forEach(pattern => {
    const result = cli.processString(createRules(rules, pattern));
    t.is(
      result.stdout,
      "No rules that are unnecessary or conflict with Prettier were found."
    );
    t.is(result.code, 0);
  });
}
offRulesMacro.title = (providedTitle, rules) =>
  `${providedTitle} Does not flag: ${rules.join(", ")}`.trim();

test(offRulesMacro, ["strict", "arrow-parens", "max-len"]);

function onRulesMacro(t, rules, expected, expectedCode) {
  onPatterns.forEach(pattern => {
    const result = cli.processString(createRules(rules, pattern));
    t.is(result.stdout, expected);
    t.is(result.code, expectedCode);
  });
}
onRulesMacro.title = (providedTitle, rules) =>
  `${providedTitle} Does flag: ${rules.join(", ")}`.trim();

test(
  onRulesMacro,
  ["strict", "arrow-parens"],
  dedent`
    The following rules are unnecessary or might conflict with Prettier:

    - arrow-parens
  `,
  2
);

test(
  onRulesMacro,
  ["strict", "max-len"],
  dedent`
    The following rules are enabled but can only be enabled in some cases.
    It is up to you to check if they are configured correctly. See:
    https://github.com/prettier/eslint-config-prettier#special-rules

    - max-len
  `,
  3
);

test(
  onRulesMacro,
  [
    "strict",
    "max-len",
    "arrow-spacing",
    "quotes",
    "arrow-parens",
    "no-mixed-operators",
    "curly",
    "react/jsx-indent",
    "flowtype/semi"
  ],
  dedent`
    The following rules are unnecessary or might conflict with Prettier:

    - arrow-parens
    - arrow-spacing
    - flowtype/semi
    - react/jsx-indent

    The following rules are enabled but can only be enabled in some cases.
    It is up to you to check if they are configured correctly. See:
    https://github.com/prettier/eslint-config-prettier#special-rules

    - curly
    - max-len
    - no-mixed-operators
    - quotes
  `,
  2
);
