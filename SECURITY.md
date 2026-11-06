# Security Policy

## Supported versions

Security fixes should target the currently maintained `main` branch. Releases and deployed environments may lag behind the repository; report the affected deployment and commit when known.

## Reporting a vulnerability

Please do not publish exploitable details, credentials, personal data, or proof-of-concept attacks in a public issue.

Use GitHub's **Report a vulnerability** feature (private vulnerability reporting) if it is enabled for this repository. Otherwise, contact the repository maintainers privately through a verified channel.

Include, where safe:

- A concise description and affected component.
- Reproduction steps and required privileges.
- Potential impact and affected versions/commit.
- A suggested mitigation, if known.

Do not include real user data or live secrets in the report.

## Security expectations

- Secrets belong in environment-variable stores, never in Git.
- User-owned resources must enforce object-level authorization on the server.
- Uploads must be validated server-side and served with appropriate access controls.
- Authentication, rate limiting, session/token lifecycle, CORS, CSRF, and production security settings must be reviewed together.
- CI checks do not replace a security review or production configuration audit.
