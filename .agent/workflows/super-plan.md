---
description: Phase 1 of Super-Dev-Pro - Extensive Planning and Technical Research
---

# Super Plan Workflow

## 1. Skill & Knowledge Assessment
- **Analyze Skills**: Search `.agent/skills/` and activate every skill relevant to the task (e.g., `rag-engineer`, `langchain`, `auth-priority`).
- **Context Review**: Read `docs/system-architecture.md` and `docs/code-standards.md` to understand the current environment.

## 2. Parallel Research
- **Multi-Agent Research**: Spawn multiple researcher sub-tasks in parallel to investigate:
    - Best practices for the specific technical stack.
    - Potential edge cases and library limitations.
    - Security implications of the proposed change.
- **Reference Gathering**: Use `docs-seeker` to pull external documentation if external plugins are involved.

## 3. Implementation Planning
- **Plan Creation**: Delegate to `planner` agent to create a detailed implementation plan in `./plans/`.
- **Breakdown**: Ensure the plan contains atomic TODO tasks that respect the 200-line file limit.
- **Token Efficiency**: Design the plan to minimize redundant context passing and token usage.

## 4. Design Verification
- Verify the plan follows the **Orchestration Protocol**: Planning → Implementation → Testing → Review.
- Ensure no shared resource contention if parallel implementation is planned.
