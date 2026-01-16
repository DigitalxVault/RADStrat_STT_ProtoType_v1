# RADStrat STT Prototype - Debug Journal

Issue tracking and debugging log for development.

---

## Active Issues

*No active issues*

---

## Resolved Issues

*No resolved issues yet*

---

## Issue Template

```markdown
### ISSUE-XXX: [Brief Title]

**Date Identified**: YYYY-MM-DD
**Status**: Open | In Progress | Resolved | Won't Fix
**Severity**: Critical | High | Medium | Low
**Component**: Backend | Frontend | API | Scoring | UI

#### Description
[Detailed description of the issue]

#### Steps to Reproduce
1. Step one
2. Step two
3. Step three

#### Expected Behavior
[What should happen]

#### Actual Behavior
[What actually happens]

#### Error Messages
```
[Any error messages, stack traces, or console output]
```

#### Environment
- Browser: [Chrome/Firefox/Safari]
- OS: [macOS/Windows/Linux]
- Node Version: [X.X.X]
- npm Version: [X.X.X]

#### Root Cause Analysis
[Analysis of why the issue occurred]

#### Solution Implemented
[Description of the fix]

#### Files Modified
- `path/to/file1.ts`
- `path/to/file2.tsx`

#### Prevention Measures
[Steps to prevent similar issues in the future]

#### Related Issues
- ISSUE-XXX
- ISSUE-YYY

#### Date Resolved
YYYY-MM-DD
```

---

## Severity Definitions

| Severity | Definition | Response Time |
|----------|------------|---------------|
| Critical | System unusable, data loss risk | Immediate |
| High | Major feature broken, no workaround | Same day |
| Medium | Feature impaired, workaround exists | 2-3 days |
| Low | Minor issue, cosmetic, edge case | Backlog |

---

## Component Categories

| Component | Description |
|-----------|-------------|
| Backend | Server-side Node.js/Express code |
| Frontend | React/Vite client-side code |
| API | External API integrations (OpenAI, Grok) |
| Scoring | Scoring engine logic |
| UI | Visual/styling issues |
| Data | Scenario data, localStorage |
| Config | Environment, settings |

---

## Debugging Checklist

### Backend Issues
- [ ] Check server logs
- [ ] Verify environment variables (.env)
- [ ] Check API key validity
- [ ] Test endpoint with curl/Postman
- [ ] Check middleware chain
- [ ] Verify TypeScript compilation

### Frontend Issues
- [ ] Check browser console
- [ ] Check network tab (API calls)
- [ ] Verify component props
- [ ] Check state management
- [ ] Test in different browsers
- [ ] Check responsive breakpoints

### API Integration Issues
- [ ] Verify API key in .env
- [ ] Check request format (body, headers)
- [ ] Check API rate limits
- [ ] Verify response parsing
- [ ] Check error handling
- [ ] Test with API playground

### Scoring Issues
- [ ] Log input/output of each engine
- [ ] Verify expected vs actual comparison
- [ ] Check normalization logic
- [ ] Test edge cases (empty, special chars)
- [ ] Verify prompt templates
- [ ] Check difficulty mode switching

---

## Known Limitations

| Limitation | Description | Workaround |
|------------|-------------|------------|
| *None documented yet* | | |

---

## Performance Notes

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Page Load | < 3s | TBD | |
| STT Response | < 10s | TBD | |
| Scoring Response | < 5s | TBD | |

---

## API Error Reference

### OpenAI Errors
| Error Code | Meaning | Resolution |
|------------|---------|------------|
| 401 | Invalid API key | Check OPENAI_API_KEY in .env |
| 429 | Rate limit exceeded | Implement retry with backoff |
| 500 | Server error | Retry, check OpenAI status |

### Grok Errors
| Error Code | Meaning | Resolution |
|------------|---------|------------|
| 401 | Invalid API key | Check GROK_API_KEY in .env |
| 429 | Rate limit exceeded | Implement retry with backoff |

---

## Useful Debug Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Check TypeScript compilation
npx tsc --noEmit

# Run server with verbose logging
DEBUG=* npm run dev

# Check environment variables loaded
node -e "console.log(require('dotenv').config())"
```

---

## Browser Debug Tips

```javascript
// Check localStorage
console.log(localStorage.getItem('radstrat-logs'));
console.log(localStorage.getItem('radstrat-parameters'));

// Clear localStorage
localStorage.clear();

// Check audio permissions
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Mic access granted'))
  .catch(err => console.log('Mic access denied:', err));
```

---

## Notes

- Update this file immediately when encountering issues
- Include reproduction steps for all bugs
- Document solutions for future reference
- Link related issues for tracking dependencies
