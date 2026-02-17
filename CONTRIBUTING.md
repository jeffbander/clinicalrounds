# Contributing to ClinicalRounds

Thank you for your interest in contributing. ClinicalRounds is an open-source AI clinical reasoning tool and we welcome contributions from developers, clinicians, and anyone interested in improving multidisciplinary case review.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/clinicalrounds.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`
5. Set up your environment: `cp .env.example .env.local` and add your `ANTHROPIC_API_KEY`
6. Start the dev server: `npm run dev`

## Development Workflow

### Before Submitting a PR

```bash
# Ensure your code passes all checks
npm run lint
npm test
npm run build
```

All three must pass. The CI pipeline enforces this.

### Code Standards

- **TypeScript strict mode** -- no `any` types, no `@ts-ignore`
- All specialist outputs must conform to the `SpecialistAnalysis` type in `lib/types.ts`
- Use `Promise.all()` for parallel API calls -- never sequential
- Streaming via SSE for the synthesis route

### Project Structure

| Directory | Purpose |
|---|---|
| `app/api/` | API routes for each pipeline stage |
| `components/` | React components |
| `lib/prompts/` | Specialist system prompts (clinical expertise) |
| `lib/orchestrator.ts` | Multi-agent orchestration engine |
| `lib/types.ts` | TypeScript interfaces and enums |
| `tests/` | Vitest test suite |

## Types of Contributions

### Bug Reports

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Any relevant console errors

### Feature Requests

Open an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Specialist Prompt Improvements

The specialist prompts in `lib/prompts/` contain embedded clinical expertise. If you're a clinician and want to improve a specialist's reasoning:

- **Do** add clinical scoring systems, validated thresholds, or guideline references
- **Do** improve the specificity of recommendations
- **Do** add edge cases the specialist should handle
- **Do not** simplify the prompts -- they are intentionally detailed
- **Do not** remove clinical knowledge to save tokens

When modifying prompts, explain the clinical rationale in your PR description and cite relevant guidelines or literature where applicable.

### New Specialists

To add a new specialist:

1. Create a new prompt file in `lib/prompts/` following the existing pattern
2. Add the specialist to the `Specialist` enum in `lib/types.ts`
3. Add configuration to `SPECIALIST_CONFIG` in `lib/types.ts`
4. Add keyword routing in `lib/orchestrator.ts` for cross-consultation
5. Export the prompt from `lib/prompts/index.ts`
6. Add tests

### UI/UX Improvements

- Components use [shadcn/ui](https://ui.shadcn.com/) and Tailwind CSS
- Maintain mobile responsiveness
- Keep the clinical disclaimer visible on every page

## Pull Request Process

1. Create a focused PR that addresses one concern
2. Write a clear description of what changed and why
3. Include screenshots for UI changes
4. Ensure CI passes (lint, test, build)
5. Request review

## Code of Conduct

- Be respectful and constructive
- Focus on the technical merits of contributions
- Welcome newcomers and help them get started
- Clinical accuracy is a priority -- cite your sources

## Questions?

Open an issue or start a discussion. We're happy to help.
