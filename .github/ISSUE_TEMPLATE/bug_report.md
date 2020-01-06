---

name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: ''
---**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

**Expected behavior**
A clear and concise description of what you expected to happen.

**Debug log**
If applicable, add screenshots to help explain your problem.

If the bug occurs on editor/IDE, turn on verbose log with the following and paste tssserver.log of from the replay.

```sh
$ export TSS_LOG="-file `pwd`/tsserver.log -level verbose"
```

If the bug occurs on CLI, paste log with `--verbose` option.

**Additional context**
Add any other context about the problem here.
