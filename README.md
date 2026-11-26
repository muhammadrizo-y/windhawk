<p align="center">
  <img src="assets/extension-icon.png" width="64" alt="">
  <h1 align="center">Windhawk</h1>
</p>

A [Raycast](https://raycast.com) extension to install and manage Windhawk mods

## Requirements

- [Windhawk](https://windhawk.net) v2.0 alpha 3 or newer installed on Windows.

## Commands

### Manage Mods

Manage installed Windhawk mods

- View mod details: mod ID, README, version, author, GitHub, target processes, etc.
- Enable / disable mods
- Configure mod settings
- Update mods
- Uninstall mods
- View changelog
- View source code
- Copy mod info
- Copy terminal commands

### Search Mods

Search and install Windhawk mods

- View mod details: mod ID, README, version, author, GitHub, target processes, etc.
- Enable / disable mods
- Install / uninstall mods
- Install specific versions
- Update mods
- View changelog
- View source code
- Copy mod info
- Copy terminal commands

## Development

- `npm run build` — build the extension.
- `npm run lint` — validate the extension and its formatting.
- `npm test` — run the settings and worker-request regression tests.
- `npm run test:installed` — read every installed mod's declarations, values, and dynamic options, then verify that its stored values round-trip through the settings model. This does not write settings. Pass a custom CLI path with `npm run test:installed -- "C:\path\to\windhawk-cli.exe"`.
