# Security Policy

## Privacy Architecture

ClinicalRounds is designed with a zero-retention architecture:

- **No database.** There is no database. All state is held in React client-side state.
- **No PHI storage.** Clinical text exists only in browser memory during the active session. Nothing is logged, cached, or persisted to disk.
- **No user accounts.** No authentication, no user profiles, no session persistence.
- **Ephemeral sessions.** Close the browser tab and all data is gone.
- **API-level processing.** Clinical notes are sent to the Anthropic Claude API for processing. Anthropic's data handling policies apply to API calls. See [Anthropic's privacy policy](https://www.anthropic.com/privacy) for details.

## Security Headers

The application sets the following security headers on all responses:

- `X-DNS-Prefetch-Control: on`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cache-Control: no-store, no-cache, must-revalidate` (API routes)

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainers directly or use GitHub's private vulnerability reporting
3. Include steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Scope

The following are in scope for security reports:

- XSS or injection vulnerabilities in the web application
- Unintended data persistence or logging of clinical text
- Authentication bypass (if auth is added in the future)
- Insecure API route handling
- Dependency vulnerabilities with a known exploit path

The following are out of scope:

- Anthropic API data handling (report to Anthropic directly)
- Browser-level attacks requiring physical access
- Social engineering

## Best Practices for Self-Hosting

If you deploy ClinicalRounds on your own infrastructure:

- **Use HTTPS.** Never run in production without TLS.
- **Protect your API key.** Set `ANTHROPIC_API_KEY` as an environment variable, never commit it to source control.
- **Network isolation.** Consider running behind a VPN or internal network if used in a clinical setting.
- **Access controls.** Add authentication at the reverse proxy level if needed for your environment.
- **Keep dependencies updated.** Run `npm audit` regularly.
