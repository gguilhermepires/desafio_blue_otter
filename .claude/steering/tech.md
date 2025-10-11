# Technical Stack

## Current State

This repository is currently in initial setup phase with no application code. The tech stack will be determined during the requirements and design phases of the first feature.

## Development Framework

### Spec-Driven Development Workflow

Use Claude Code's spec workflow system located in `.claude/` for all feature development:

- **Spec agents**: Specialized agents handle requirements, design, task planning, implementation, and testing
- **Parallel execution**: Support for running multiple agents in parallel (1-128) for requirements, design, and task planning phases
- **Tree-based evaluation**: When using parallel agents (≥2), results are evaluated using tree-based judging
- **Workflow files**: All workflow configuration is in `.claude/agents/kfc/` and `.claude/system-prompts/`

### Agent Types

- `spec-requirements`: Create and refine requirements documents
- `spec-design`: Create and refine design documents
- `spec-tasks`: Create and refine task planning documents
- `spec-judge`: Evaluate parallel agent outputs
- `spec-impl`: Execute implementation tasks in parallel when requested
- `spec-test`: Create test documentation and test code

## Common Commands

### Git Operations

```bash
# Check repository status
git status

# View commit history
git log --oneline

# Create commits (when requested by user)
git add . && git commit -m "message"
```

### Spec Workflow

Specs are managed through Claude Code agents. All spec documents are created in `.claude/specs/{feature-name}/`:

- `requirements.md`: Feature requirements in EARS format
- `design.md`: Detailed design document
- `tasks.md`: Implementation task breakdown

## Development Rules

### Spec Document Modifications

**Main thread handles**:
- Find and replace operations
- Format adjustments and Markdown fixes
- Small-scale content updates (version numbers, single config values)

**Sub-agents handle**:
- Content creation (new requirements, design, task documents)
- Structural modifications
- Logical updates (business processes, architecture)
- Professional judgment requiring domain knowledge

### Constraints

- Never create spec documents directly - always use sub-agents
- All requirements operations go through `spec-requirements`
- All design operations go through `spec-design`
- All task operations go through `spec-tasks`
- Avoid parentheses in Mermaid diagram node text (causes parsing errors)
- Always read files before editing them
