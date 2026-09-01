# IBM Bob Usage Evidence

This folder contains screenshots documenting IBM Bob's role as the primary development tool throughout the AstroKestrel build.

## Contents

| File | What it shows |
|------|---------------|
| `screenshot-csv-git-fix.png` | Bob diagnosing untracked CSV files in `data/Raw` — instructs `git add data/raw/` and explains why `git status` showed clean falsely |
| `screenshot-token-usage-145k.png` | Bob token usage popup: **54% full / 145.1k of 270k tokens** — captured mid-session with README and git commit visible |
| `screenshot-token-usage-207k.png` | Bob token usage popup: **77% full / 207.1k of 270k tokens** — full breakdown showing system prompt, MCP tools, messages |
| `screenshot-bobcoin-28-40.png` | Bob in-app Bobcoin popup: **28.17 / 40 Bobcoins spent**, 29% budget remaining, trial ends Sep 6 2026 |
| `screenshot-bobcoin-admin-console.png` | IBM Bob Admin Console — **Monthly Bobcoin usage: 28 spent / 40 budget**, bar chart, `bob-001 (us-east)` instance |
| `screenshot-bob-html-audit.png` | Bob auditing `Menu.html` for syntax and functional errors — 9 issues found across 4 severity levels |

## What This Proves

- **Heavy real usage**: 207k/270k tokens consumed (77% full context) across sessions
- **Verified billing**: 28/40 Bobcoins spent — objective, account-level proof from IBM Admin Console
- **Active code work**: Bob diagnosing CSV git issues, auditing HTML files, running git commands
- **Consistent session**: Both token popups and Bobcoin popup captured inside the AstroKestrel workspace
