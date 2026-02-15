# @mosherw/git-contributor-summary

CLI tool that prints Git contributor statistics as a readable histogram.

## Install

```
npm install -g @mosherw/git-contributor-summary
```

## Usage

```
git-contributor-summary [path-to-git-repo]

## Flags

```
-e, --exists  Show a line-ownership summary for the current files in the repo
```
```

### Notes

- If no path is provided, the current directory is used.
- Output includes additions and deletions per contributor.
- Filters out malformed or non-human contributors.

## Examples

```
git-contributor-summary ../my-git-project
```

```
git-contributor-summary
```

```
git-contributor-summary -e
```


## License

MIT
