---
description: Phase 2 of Super-Dev-Pro - High-Quality Implementation following Core Rules
---

# Super Implementation Workflow

## 1. Core Principles
- **YAGNI (You Aren't Gonna Need It)**: Do not over-engineer.
- **KISS (Keep It Simple, Stupid)**: Prioritize readability and simple logic.
- **DRY (Don't Repeat Yourself)**: Abstract common logic into utilities or services.

## 2. File & Structure Rules
- **Naming**: Use `kebab-case` for all files. Names must be descriptive enough for LLMs to understand the purpose via `grep` alone.
- **Size**: Keep files under 200 lines. Split large files using composition.
- **No Enhancements**: Update existing files directly. **DO NOT** create `.enhanced` or `.v2` versions.
- **Real Code**: No mocks, cheats, or "placeholder" implementations. Every line must be production-ready.

## 3. Implementation Workflow
- **Skill Usage**: Follow the specific design patterns in the activated `SKILL.md` files.
- **Error Handling**: Implement robust `try-catch` blocks and cover security standards throughout the code.
- **Compilation Check**: After every file modification, run the appropriate build/compile command (`npm run build`, `tsc`, etc.) to verify syntax.

## 4. Specific Tools
- Use `psql` for database debugging.
- Use `imagemagick` or `ai-multimodal` for asset-related tasks.
- Use `sequential-thinking` for complex logic puzzles.
