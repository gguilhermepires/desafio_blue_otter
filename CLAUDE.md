# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **desafio_blue_otter** repository (Blue Otter Challenge). The project uses a spec-driven development methodology where features are systematically developed through three sequential phases: Requirements → Design → Implementation Tasks. Each phase requires explicit user approval before proceeding to the next.

## Spec-Driven Development Workflow

### Core Principle

Follow the three-phase workflow strictly. Never skip phases or proceed without explicit user approval:

1. **Requirements Phase**: Create detailed requirements in EARS format
2. **Design Phase**: Develop comprehensive design documents based on approved requirements
3. **Task Planning Phase**: Create actionable implementation plans based on approved design
4. **Implementation Phase**: Execute tasks systematically from the approved plan

### Spec Document Structure

All feature specs are created in `.claude/specs/{feature-name}/`:

```
.claude/specs/{feature-name}/
├── requirements.md    # EARS format requirements with user stories
├── design.md          # Architecture, components, data models, business processes
└── tasks.md           # Numbered task checklist with dependencies
```

Use **kebab-case** for feature names (e.g., `user-authentication`, `data-export`).

### Working with Specialized Agents

This repository uses specialized sub-agents for different phases. The main thread (you) coordinates the workflow and handles user interaction, while sub-agents do the specialized work.

#### Agent Types

- **spec-requirements**: Create/refine requirements documents in EARS format
- **spec-design**: Create/refine design documents with architecture diagrams
- **spec-tasks**: Create/refine implementation task lists with dependencies
- **spec-judge**: Evaluate parallel agent outputs using tree-based scoring
- **spec-impl**: Execute specific implementation tasks in parallel mode

#### When to Use Main Thread vs Sub-Agents

**Main thread handles:**
- Find/replace operations and global renaming
- Markdown formatting fixes
- Small updates (version numbers, single values)
- Workflow coordination and user interaction

**Sub-agents handle:**
- Creating new spec documents (requirements, design, tasks)
- Structural modifications to documents
- Logical updates (business processes, architecture changes)
- Professional judgment requiring domain knowledge

**Critical rule**: Never create or perform complex modifications on spec documents directly. Always use the appropriate sub-agent (spec-requirements, spec-design, or spec-tasks).

### Parallel Execution Support

When creating requirements, design, or task documents, you can run multiple agents in parallel (1-128) for diverse solutions:

1. Ask user: "How many agents to use? (1-128)"
2. Launch N agents in parallel with output_suffix (`_v1`, `_v2`, etc.)
3. Use tree-based judging with spec-judge agents:
   - Round 1: Groups of 3-4 documents per judge → Select best from each group
   - Continue rounds until ≤3 documents remain
   - Final round: 1 judge selects winner
4. Rename final selection to standard name (e.g., `requirements_v3456.md` → `requirements.md`)
5. Tell user document is finalized and ready for review

**Important**: The main thread must handle the final rename operation. Never use wildcards when deleting evaluated documents.

### Implementation Execution Modes

When executing tasks from `tasks.md`, use one of three modes:

- **Default mode**: Main thread executes tasks one at a time (better user interaction)
- **Parallel mode**: Use spec-impl agents when user explicitly requests parallel execution (e.g., "execute task2.1 and task2.2 in parallel")
- **Auto mode**: When user requests automatic execution, analyze task dependencies and orchestrate spec-impl agents to run independent tasks in parallel while respecting dependencies

In default mode, execute only one task at a time and update `tasks.md` to mark it complete (`- [ ]` → `- [x]`). Do not move to the next task automatically unless user explicitly requests it.

## Architecture and Design Patterns

### Requirements Format (EARS)

Use Easy Approach to Requirements Syntax with these keywords:
- **WHEN**: Trigger condition
- **IF**: Precondition
- **WHERE**: Specific function location
- **WHILE**: Continuous state

Each must be followed by **SHALL** for mandatory requirements. Structure:

```markdown
### Requirement 1

**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN [system] SHALL [response]
2. IF [precondition] THEN [system] SHALL [response]
```

### Design Document Sections

Design documents must include:
- Overview with goals and scope
- Architecture Design
  - System Architecture Diagram (Mermaid)
  - Data Flow Diagram (Mermaid)
- Component Design (responsibilities, interfaces, dependencies)
- Data Models (TypeScript interfaces or class diagrams)
- Business Process (Mermaid flowcharts or sequence diagrams)
- Error Handling Strategy
- Testing Strategy

**Mermaid diagram rule**: Avoid parentheses in node text - they cause parsing errors. Use `W[Call provider.refresh]` instead of `W[Call provider.refresh()]`.

### Task List Format

Implementation tasks must:
- Be formatted as numbered checkboxes with max 2 levels of hierarchy
- Use decimal notation for subtasks (1.1, 1.2, 2.1, etc.)
- Include specific requirement references (e.g., `_Requirements: 1.1, 2.3_`)
- Focus ONLY on coding activities (writing, modifying, testing code)
- Build incrementally on previous tasks
- Be actionable by a coding agent without additional clarification

**Explicitly exclude**: User testing, deployment, performance metrics gathering, documentation creation, or any non-coding activities.

Include a **Tasks Dependency Diagram** at the END using Mermaid flowchart format to facilitate parallel execution.

## Common Workflow Patterns

### Starting a New Feature

1. User describes feature idea
2. Choose kebab-case feature name
3. Create TodoWrite tasks for the three-phase workflow
4. Create directory: `.claude/specs/{feature-name}/`
5. Ask: "How many spec-requirements agents to use? (1-128)"
6. Launch agents to create requirements documents
7. If multiple agents: Use tree-based judging, rename final selection
8. Ask user to review and explicitly approve requirements
9. Repeat for design phase, then task planning phase

### Explicit Approval Required

After updating any spec document, you MUST:
1. Ask user: "Do the {requirements/design/tasks} look good? If so, we can move on to {design/tasks/implementation}."
2. Wait for explicit approval ("yes", "approved", "looks good", etc.)
3. If user provides feedback, make modifications and ask for approval again
4. Continue feedback-revision cycle until explicit approval received
5. Only then proceed to next phase

### Handling Stalled Progress

If requirements clarification stalls:
- Suggest moving to different aspect of requirements
- Provide examples or options for decisions
- Summarize established ground truth and identify gaps
- Consider conducting research to inform decisions

## Technical Constraints

- Always read files before editing them
- Main thread must coordinate workflow and user interaction
- Sub-agents handle specialized document creation/modification
- Mark parent tasks complete only when all subtasks are complete
- Never skip hooks (git --no-verify) unless user explicitly requests
- When creating Mermaid diagrams, avoid parentheses in node text
- After parallel sub-agent calls, always use spec-judge for evaluation

## Repository Information

- **GitHub**: https://github.com/gguilhermepires/desafio_blue_otter.git
- **Configuration**: `.claude/settings/kfc-settings.json` defines paths for specs, steering, and settings
- **Workflow Definition**: `.claude/system-prompts/spec-workflow-starter.md` contains complete workflow instructions
- **Steering Documents**: `.claude/steering/` contains product.md, tech.md, and structure.md for project guidance

## Git Workflow

Standard git operations apply. When user requests commits:
1. Run `git status` and `git diff` to see changes
2. Review all staged and unstaged changes
3. Draft commit message ending with:
   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
4. Use heredoc format for commit messages
5. Do not push unless explicitly requested

## Steering Documents

Additional project guidance is available in `.claude/steering/`:
- `product.md`: Development approach and key principles
- `tech.md`: Spec workflow details and development rules
- `structure.md`: Directory organization and file lifecycle
