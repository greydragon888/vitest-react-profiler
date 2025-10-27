# SonarCloud Setup Guide

This guide will help you set up SonarCloud for code quality analysis.

## Prerequisites

- GitHub repository (already have: `greydragon888/vitest-react-profiler`)
- SonarCloud account

## Setup Steps

### 1. Create SonarCloud Account

1. Go to [SonarCloud](https://sonarcloud.io)
2. Sign in with GitHub
3. Authorize SonarCloud to access your repositories

### 2. Import Your Repository

1. Click **"+"** → **"Analyze new project"**
2. Select your organization: `greydragon888`
3. Choose repository: `vitest-react-profiler`
4. Click **"Set Up"**

### 3. Choose Analysis Method

1. Select **"With GitHub Actions"**
2. SonarCloud will show your project key: `greydragon888_vitest-react-profiler`

### 4. Create SONAR_TOKEN Secret

1. In SonarCloud, go to **Account** → **Security** → **Generate Token**
2. Name it: `vitest-react-profiler-token`
3. Copy the generated token
4. In GitHub repo, go to **Settings** → **Secrets and variables** → **Actions**
5. Click **"New repository secret"**
6. Name: `SONAR_TOKEN`
7. Value: paste the token
8. Click **"Add secret"**

### 5. Push Changes

```bash
git add .
git commit -m "feat: add SonarCloud integration"
git push
```

The GitHub Action will automatically:

- Run tests with coverage
- Upload coverage to SonarCloud
- Analyze code quality
- Check quality gate

### 6. Configure Quality Gate (Optional)

In SonarCloud project settings:

1. **Quality Gates** → Use default or create custom
2. **New Code** settings:
   - Coverage: ≥ 80%
   - Duplications: ≤ 3%
   - Maintainability Rating: A
   - Reliability Rating: A
   - Security Rating: A

### 7. View Results

- **SonarCloud Dashboard**: https://sonarcloud.io/project/overview?id=greydragon888_vitest-react-profiler
- **Badge in README**: Will update automatically after first analysis

## Troubleshooting

### Badge shows "unknown"

- Wait for first GitHub Actions run to complete
- Badge updates after successful analysis (2-3 minutes)

### Quality Gate fails

Check SonarCloud dashboard for specific issues:

- Code smells
- Security hotspots
- Bugs
- Coverage drops

### Analysis fails

1. Check GitHub Actions logs
2. Verify `SONAR_TOKEN` secret is set correctly
3. Ensure `sonar-project.properties` is configured properly

## Maintenance

### Update Coverage Threshold

Edit `.github/workflows/sonarcloud.yml`:

```yaml
-Dsonar.coverage.threshold=80
```

### Exclude Files

Edit `sonar-project.properties`:

```properties
sonar.exclusions=**/node_modules/**,**/dist/**,**/new-folder/**
```

## Useful Links

- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Quality Gates](https://docs.sonarcloud.io/improving/quality-gates/)
- [Coverage](https://docs.sonarcloud.io/enriching/test-coverage/test-coverage-parameters/)
