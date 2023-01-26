# The summary

This repo demonstrates an issue I ran into when investigating a module resolution error with Vitest and an internal package. I was seeing different behavior with regards to which modules within the package were evaluated between Vite and code being run by Vitest. It appeared that some modules weren't being evaluated at all, resulting in missing methods in tests. I couldn't discern any pattern between which modules were evaluated and which were not.

Looking around at some issues in the Vitest repo lead me to the `deps.inline` config option. After adding the module to the `deps.inline` array, I got a new error from the test file about `exports.hasOwnProperty` not being a function. The cause of this seems to be that older TypeScript versions drop the following function at the top of modules which use the `export * from` syntax:

```js
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
```

I haven't looked too deeply at the codebase, but it does look like maybe the `exports` object passed to the compiled module was created using [`Object.create(null)`](https://github.com/vitest-dev/vitest/blob/v0.28.1/packages/vite-node/src/client.ts#L307), thus preventing use of any of `Object`'s methods through lookup. 

Notably, this code will evaluate just fine in Node, as Node's `exports` object includes `Object` in its prototype chain.

Later versions of TypeScript (anything past 4.0.0-dev.20200711) include a fix ([PR 39537](https://github.com/microsoft/TypeScript/pull/39537)) to make this code work when the property of `exports` is set to `null`. In these versions, the function uses `Object.prototype.hasOwnProperty.call(exports, p)` instead of `exports.hasOwnProperty(p)`. In the meantime though, code generated with older versions of TypeScript will fail to run in Vitest, but evaluate as expected in Node or when bundled with Vite.

# The demo

## Requirements

- npm 8
- Node 16+

## The issue

1. Clone repo
2. `cd` to repo directory
3. Install dependencies of the math and main packages: `cd math; npm install; cd ../main; npm install`
4. Run the test script of the main package: `npm test`

At this point, you should see the single test in example.test.js fail with the following error:

```
 FAIL  example.test.js [ example.test.js ]
TypeError: exports.hasOwnProperty is not a function
 ❯ __export node_modules/math/dist/index.js:3:35
      1| "use strict";
      2| function __export(m) {
      3|     for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
       |                                   ^
      4| }
      5| exports.__esModule = true;
 ❯ node_modules/math/dist/index.js:6:1
 ❯ example.test.js:3:31
```

## The fix

Bumping the version of TypeScript used by the math package to at least 4.0.0-dev.20200711 will fix the issue. There's a demonstration of this on the `fixed` branch.

To use it:

1. Checkout the branch with the fixed version of the dependency: `git checkout fixed`
2. Re-install dependencies of the math package: `cd ../math; npm install`
3. Run the test script of the main package: `npm test`

You should now see the tests pass without error.
