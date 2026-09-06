# Security Policy

Kasette is a fully client-side, offline application with no backend, no
accounts, and no network requests. The main risk surface is the metadata
parsing code (`www/meta.js`, which parses untrusted ID3/FLAC data from
imported files) and the Android WebView wrapper.

## Reporting a Vulnerability

Please report security vulnerabilities privately via
[GitHub Security Advisories](https://github.com/nico-alvz/kasette/security/advisories/new)
rather than filing a public issue.

There is no bug bounty program.
