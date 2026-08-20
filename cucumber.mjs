/**
 * Cucumber configuration.
 *
 * Compare with playwright.config.ts: Cucumber has no concept of projects,
 * browser matrices, storage state, traces, retries-with-flake-detection or an
 * HTML report of failures with screenshots. Every one of those has to be
 * hand-built in `support/hooks.ts` — which is the first and largest cost of
 * this approach, and it is paid before you write a single scenario.
 */
export default {
  import: ['cucumber/steps/**/*.ts', 'cucumber/support/**/*.ts'],
  // NOTE: TypeScript is loaded via NODE_OPTIONS='--import tsx' in the npm
  // script, NOT via a `loader:` entry here. Node deprecated `--loader` in
  // 20.6.0 and tsx now refuses it outright, so the older
  // `loader: ['tsx/esm']` recipe found in most Cucumber+TS guides fails on any
  // current Node with an error that names tsx rather than the config.
  //
  // Playwright needs none of this — it transpiles TypeScript itself. Add it to
  // the tally of infrastructure this directory exists to demonstrate.
  paths: ['cucumber/features/**/*.feature'],
  format: ['progress-bar', 'html:cucumber-report.html'],
  formatOptions: { snippetInterface: 'async-await' },
  // Cucumber parallelises by SCENARIO across worker processes, similar to
  // Playwright's workers — but each worker must construct its own browser in a
  // hook, because there is no fixture system to do it.
  parallel: 4,
};
