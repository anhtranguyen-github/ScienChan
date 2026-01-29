---
description: Unified development workflow that integrates internal skills, follows core development rules, manages processes via documentation, and executes according to the orchestration protocol.
---

# Super Dev Pro (Master Workflow)

// turbo-all

## Phase 1: Planning & Research (Ref: /super-plan)
1. **Activate Skills**: Scan `.agent/skills/` and read relevant `SKILL.md` files.
2. **Parallel Research**: Use multiple researcher agents to gather requirements.
3. **Draft Plan**: Create a detailed plan in `./plans/` with atomic TODOs.
4. **Token Efficiency**: Ensure the plan is optimized for minimal token waste.

## Phase 2: Implementation (Ref: /super-impl)
1. **Kebab-Case**: Name files descriptively.
2. **200-Line Limit**: Break down components into modules < 200 lines.
3. **Core Rules**: Apply **YAGNI, KISS, DRY**.
4. **No Mocks**: Implement real integration code only.
5. **Build Check**: Compile after every significant change.

## Phase 3: QA & Review
1. **Testing**: Delegate to `tester` agent. 
    - No "fake" passing builds. 
    - Cover error scenarios and performance.
2. **Debugging**: If tests fail, delegate to `debugger`, fix implementation, and re-test.
3. **Code Review**: Delegate to `code-reviewer`. Check for:
    - AI references in comments/commit messages (Forbidden).
    - `try-catch` coverage and security standards.
    - Consistency with `docs/code-standards.md`.

## Phase 4: Documentation & Release
1. **Manual/Auto Updates**: Delegate to `docs-manager` or `project-manager`.
    - **Changelog**: Update `./docs/project-changelog.md` with features/fixes.
    - **Roadmap**: Update progress in `./docs/development-roadmap.md`.
    - **Architecture**: Update `./docs/system-architecture.md` if structure changed.
2. **Pre-commit**: 
    - Run linting (prioritize function over style).
    - Ensure clean, AI-free commit messages using Conventional Commits.
3. **Push**: Clear all tests before pushing. No secrets/dotenv files in git.

## Orchestration Protocol
- **Sequential**: Plan → Implement → Test → Review.
- **Parallel**: Use for independent features to maximize efficiency.
- **Context Passing**: Ensure sub-agents have the full context of the plan and previous results.
