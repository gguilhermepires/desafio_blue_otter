# Project Structure

## Directory Organization

```
desafio_blue_otter/
├── .claude/                     # Claude Code configuration
│   ├── agents/                  # Agent definitions
│   │   └── kfc/                 # Spec workflow agents
│   │       ├── spec-requirements.md
│   │       ├── spec-design.md
│   │       ├── spec-tasks.md
│   │       ├── spec-impl.md
│   │       ├── spec-test.md
│   │       ├── spec-judge.md
│   │       └── spec-system-prompt-loader.md
│   ├── settings/                # Configuration files
│   │   └── kfc-settings.json    # Spec workflow settings
│   ├── specs/                   # Feature specifications (empty initially)
│   ├── steering/                # Steering documents (this directory)
│   └── system-prompts/          # Workflow prompts
│       └── spec-workflow-starter.md
└── .git/                        # Git repository
```

## Key Locations

### Configuration

- **Settings**: `.claude/settings/kfc-settings.json` - Defines paths for specs, steering, and settings directories
- **Workflow definition**: `.claude/system-prompts/spec-workflow-starter.md` - Complete spec workflow system prompt

### Spec Documents

All feature specs are created in: `.claude/specs/{feature-name}/`

Each feature directory contains:
- `requirements.md` - Requirements in EARS format
- `design.md` - Detailed design document
- `tasks.md` - Implementation task breakdown

### Naming Conventions

- **Feature names**: Use kebab-case (e.g., `user-authentication`, `data-export`)
- **Spec documents**: Standard names (`requirements.md`, `design.md`, `tasks.md`)
- **Parallel outputs**: Append suffix during evaluation (e.g., `requirements_v1.md`, `design_v2.md`)
- **Final selection**: Rename to standard name after tree-based evaluation

## File Organization Rules

### Spec Document Lifecycle

1. **Creation**: Sub-agents create initial documents with optional suffixes for parallel execution
2. **Evaluation**: When multiple versions exist (≥2), tree-based judging selects the best
3. **Finalization**: Main thread renames selected document to standard name
4. **Review**: User reviews and approves before proceeding to next phase

### What Goes Where

- **Requirements**: All feature requirements go in `{feature-name}/requirements.md`
- **Design**: All design decisions go in `{feature-name}/design.md`
- **Tasks**: All implementation tasks go in `{feature-name}/tasks.md`
- **Implementation code**: Will be created in project root based on task execution (structure TBD)
- **Tests**: Co-located with implementation code (structure TBD)

## Current State

The repository is freshly initialized with the spec workflow framework. No feature specs or application code exist yet. Directory structure will expand as features are developed through the spec workflow.
