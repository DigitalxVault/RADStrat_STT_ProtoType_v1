# RADStrat STT Prototype - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Phase 1: Backend foundation and data layer
- Phase 2: Scoring engine implementation
- Phase 3: Frontend shell with tab navigation
- Phase 4: STT Test tab functionality
- Phase 5: Parameters tab with persistence
- Phase 6: Logs tab with cost tracking
- Phase 7: Integration and polish

---

## [0.1.0] - 2026-01-14

### Added
- **Documentation Foundation (Phase 0)**
  - Created `PRD.md` - Comprehensive Product Requirements Document
  - Created `tasks.md` - Task tracking with all implementation tasks
  - Created `changelog.md` - Version history tracking
  - Created `debug.md` - Issue tracking and debugging journal

- **Reference Documentation**
  - `docs/styleguide.md` - Design system specifications
  - `docs/training_scenarios.json` - 20 RT scenarios across 4 series
  - `docs/raw_transcript.md` - Raw scenario transcript data
  - `docs/Transcript Template.md` - RT structure template
  - `docs/openai_pricing.md` - OpenAI API pricing reference
  - `docs/grok-pricing.md` - Grok API pricing reference
  - `docs/FULLSTACK_FUNDAMENTALS_PLAYBOOK.md` - Architecture patterns

### Technical Decisions
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Architecture**: NestJS-style modular structure (per FULLSTACK_FUNDAMENTALS_PLAYBOOK.md)
- **Styling**: Paper-on-dark theme with yellow accent (per styleguide.md)
- **Storage**: Browser localStorage for logs and parameters
- **APIs**: OpenAI (Whisper, GPT models), Grok (grok-4.1-fast)

---

## Version History Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes

### Breaking Changes
- Changes that break backward compatibility

### Migration Notes
- Steps required to migrate from previous version
```

---

## Versioning Strategy

| Version | Type | Description |
|---------|------|-------------|
| 0.x.x | Development | Pre-release, rapid iteration |
| 1.0.0 | MVP | First stable release |
| x.Y.0 | Minor | New features, backward compatible |
| x.x.Z | Patch | Bug fixes, no new features |

---

## Release Checklist

Before tagging a new version:

- [ ] All tests pass
- [ ] No console errors
- [ ] changelog.md updated
- [ ] tasks.md reflects completion status
- [ ] debug.md issues resolved
- [ ] PRD.md requirements verified
