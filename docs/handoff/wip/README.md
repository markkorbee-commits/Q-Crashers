# Unfinished work carried over from the cloud session

`STATUS.md` (written by `tools/handoff/export-wip.sh`) lists, per fixer group of the last round, whether its branch was
merged (with the merge commit) or exported here as a `git format-patch` series in `<group>/`. The fixer branches
themselves lived only in the cloud container and are gone; these patches are all that is left of unmerged work.

## On the Mac

1. Check that the series is not already in the history (the cloud session may have merged the branch after writing
   `STATUS.md`): look for its commit subjects, e.g. `git log --oneline | grep 'stage r4'`. Found = skip the patches.
2. Apply on a branch of its own, then review, measure and merge like a fixer branch (CLAUDE.md, "Git"):

   ```sh
   git switch -c r4-stage-wip
   git am -3 docs/handoff/wip/stage/*.patch
   npx tsc --noEmit
   node scripts/validate-show.mjs --quiet
   ```

   The series was verified to apply cleanly with `git am -3` on the integrated branch when it was exported.
3. The commits are work in progress of a fixer that was still running (named `WIP ...`): its brief is
   `docs/handoff/findings/r4_<group>.md`. Finish the brief (render, measure with `scripts/similarity.mjs` against the
   Mac baseline), then merge with `git merge --no-ff` and push. If the WIP makes things worse, drop the branch.
4. Once merged or dropped, delete `docs/handoff/wip/<group>/` and its row in `STATUS.md` in the same commit.

## In the cloud session (before telling the user to switch)

```sh
tools/handoff/export-wip.sh [--with-uncommitted] stage=worktree-wf_227eec07-468-1 ...
git add docs/handoff/wip && git commit -m "Handoff: round status + WIP patches"
git push origin claude/defqon-endshow-experience-wi4oos
tools/handoff/verify-pushed.sh --clone
```
