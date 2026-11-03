---
title: Git push rejected or merge conflicts
category: Software
---

# Git push rejected or merge conflicts

Use this guide when `git push` fails with "rejected", "non-fast-forward", "Updates were rejected because the remote contains work that you do not have locally", "protected branch", or when a pull or merge stops with "CONFLICT".

## Push rejected: the remote has newer commits

1. Someone else pushed to the branch after you last pulled. Save your work first: commit or stash any changes (`git stash`).
2. Fetch and combine their work with yours: `git pull --rebase`.
3. If there are no conflicts, push again with `git push`.
4. Do not use `git push --force` on a shared branch; it deletes other people's commits. If you must replace a branch only you use, prefer `git push --force-with-lease`.

## Push rejected: protected branch

1. Branches such as `main` usually do not accept direct pushes.
2. Create a branch for your work: `git switch -c my-change`, then `git push -u origin my-change`.
3. Open a pull request (merge request) from that branch and ask for a review.

## Resolve a merge conflict

1. Run `git status`; files under "both modified" have conflicts.
2. Open each file. The conflict is marked with `<<<<<<<`, `=======` and `>>>>>>>`. Keep the correct code and delete the markers. Editors such as VS Code show **Accept Current**, **Accept Incoming** and **Accept Both** buttons.
3. Save the file and mark it resolved with `git add <file>`.
4. Continue: `git rebase --continue` during a rebase, or `git commit` during a merge.
5. To give up and return to where you started, use `git rebase --abort` or `git merge --abort`.

## Push rejected: file too large

1. Git hosts reject files over a size limit (often 100 MB). Remove the file from the commit with `git rm --cached <file>` and commit again.
2. Add the file type to `.gitignore`, or ask whether the repository uses Git LFS for large files.

## Undo common mistakes

- Undo the last commit but keep the changes: `git reset --soft HEAD~1`.
- Discard your uncommitted changes to one file: `git restore <file>`.
- Committed on the wrong branch: create the right branch with `git switch -c new-branch`; the commit comes with it.

## When to escalate

Raise a ticket if you need push rights or branch protection changes, or if a password, key or token was ever committed. A committed secret must be rotated by its owner even after it is removed from the history.
