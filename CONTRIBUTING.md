# Contributing

Thanks for taking a look at Shifteo.

## Development

Use Bun for dependencies and scripts:

```sh
bun install
bun run dev
```

Before opening a pull request, run:

```sh
bun run test
bun run lint
bun run build
```

Run `bun run e2e` for changes to the upload or conversion flow. The command requires the Playwright browsers installed with `bunx playwright install`.

## Pull requests

- Keep changes focused and explain user-visible behavior in the description.
- Add or update tests for conversion behavior and other non-trivial logic.
- Include a screenshot for visible UI changes.
- Do not add telemetry, uploads, or third-party runtime services without discussing it first.
