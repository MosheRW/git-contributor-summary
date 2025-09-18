# git-contributor-summary

A CLI tool to display git contributor statistics as a pleasant histogram.

## Installation

```
npm install -g ./
```

## Usage

```
git-contributor-summary [path-to-git-repo]
```

- If no path is provided, it uses the current directory.
- Shows a histogram of contributors' additions and deletions.
- Filters out non-human or malformed contributors.

## Example

```
git-contributor-summary ../my-git-project
```

## License

MIT
