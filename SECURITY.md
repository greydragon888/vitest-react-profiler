# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.7.x   | :white_check_mark: |
| 1.6.x   | :white_check_mark: |
| < 1.6.0 | :x:                |

## Reporting a Vulnerability

The vitest-react-profiler team takes security issues seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

### Where to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

- **Email**: <greydragon888@gmail.com>
- **Subject Line**: [SECURITY] vitest-react-profiler - [Brief Description]

### What to Include

Please include the following information to help us triage and prioritize the issue:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it
- Your name and affiliation (if you want to be credited)

### Response Timeline

- **Initial Response**: Within 48 hours, we will acknowledge receipt of your report
- **Preliminary Analysis**: Within 72 hours, we will confirm the vulnerability and determine its severity
- **Resolution Timeline**:
  - Critical severity: Fixed within 7 days
  - High severity: Fixed within 14 days
  - Medium severity: Fixed within 30 days
  - Low severity: Fixed within 60 days

### Disclosure Policy

- We will work with you to understand and resolve the issue promptly
- We will credit you for the discovery (unless you prefer to remain anonymous)
- We will maintain transparency about the fix in our release notes
- We request that you give us reasonable time to resolve the issue before public disclosure

## Security Considerations for Library Users

### Testing Environment

Since vitest-react-profiler is a testing utility, it should **NEVER** be used in production environments. Always ensure:

```json
{
  "devDependencies": {
    "vitest-react-profiler": "^1.7.0"
  }
}
```

### Best Practices

1. **Keep the library updated**: We regularly update dependencies to address security vulnerabilities

   ```bash
   npm update vitest-react-profiler
   ```

2. **Audit dependencies regularly**:

   ```bash
   npm audit
   ```

3. **Isolate test environments**: Run tests in isolated CI/CD environments with limited access

4. **Secure profiling data**: If you store profiling results, ensure they don't contain sensitive information

5. **Review test configurations**: Be cautious about what data your tests expose in logs or reports

### Known Security Considerations

- **Performance profiling data**: May reveal internal application structure
- **Render tracking**: Could expose component hierarchy and props
- **Test snapshots**: Might contain sensitive data if not properly sanitized

## Dependency Management

We use automated tools to keep dependencies updated:

- **Dependabot**: Automated security updates for dependencies
- **npm audit**: Regular vulnerability scanning
- **Snyk**: Additional security monitoring (planned)

To check for known vulnerabilities in your installation:

```bash
npm audit
npm outdated
```

## Security Features

### What we do

- Regular dependency updates
- Security-focused code reviews
- Automated vulnerability scanning
- Input validation for all public APIs
- No execution of arbitrary code
- No network requests
- No file system access beyond test requirements

### What we don't do

- Collect telemetry or usage data
- Make external API calls
- Store or transmit user data
- Execute user-provided code outside test context

## Contact

For any security-related questions that don't require immediate attention, you can also:

- Open a [GitHub Discussion](https://github.com/greydragon888/vitest-react-profiler/discussions) with the "Security" tag
- Check our [Security Advisories](https://github.com/greydragon888/vitest-react-profiler/security/advisories)

## Attribution

We would like to thank the following individuals for responsibly disclosing security issues:

_No reports yet - you could be the first!_

---

**Last Updated**: September 2025
**Next Review**: December 2025
