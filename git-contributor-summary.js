#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

// Get directory path from command line argument, default to current directory
const dirPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

let output;
try {
  output = execSync(`git log --all --pretty=format:"%aN" --numstat`, { encoding: "utf8", cwd: dirPath });
} catch (err) {
  console.error("Error running git log in directory:", dirPath);
  console.error(err.message);
  process.exit(1);
}

const lines = output.split("\n");
let lastAuthor = "";
const authorsData = {};
const twoWordsSummary = {};

for (const line of lines) {
  if (line.trim() === "") continue;
  if (/^\d/.test(line)) {
    const [added, removed] = line.split("\t").map(Number);
    const author = lastAuthor;
    const nameParts = author.split(" ");
    const twoWordsName =
      nameParts.length >= 2 ? (nameParts[0] + " " + nameParts[1]).toLowerCase() : author.toLowerCase();

    // Individual contributor data
    if (!authorsData[author]) authorsData[author] = { added: 0, removed: 0 };
    authorsData[author].added += added;
    authorsData[author].removed += removed;

    // Two-word name summary data
    if (!twoWordsSummary[twoWordsName]) twoWordsSummary[twoWordsName] = { added: 0, removed: 0 };
    twoWordsSummary[twoWordsName].added += added;
    twoWordsSummary[twoWordsName].removed += removed;
  } else {
    lastAuthor = line.trim();
  }
}

// Display a pleasant histogram for two-word name summary
function makeBar(count, char, colorCode) {
  const bar = char.repeat(Math.max(0, Math.round((count / maxValue) * 40)));
  return colorCode ? `\x1b[${colorCode}m${bar}\x1b[0m` : bar;
}

// Helper to check if a name should be hidden
function isHiddenContributor(name) {
  // Hide if name is just '-' or similar, or looks like a file path or image or contains '{' or '=>'
  if (/^\s*-+\s*-*\s*$/.test(name)) return true;
  if (/\.(png|jpg|jpeg|gif|svg|bmp)$/i.test(name)) return true;
  if (name.includes("/") || name.includes("\\")) return true;
  if (name.includes("{") || name.includes("=>")) return true;
  return false;
}

// Calculate totals for percent columns and max for bar scaling
let maxValue = 0;
let totalAdded = 0;
let totalRemoved = 0;
for (const name in twoWordsSummary) {
  if (isHiddenContributor(name)) continue;
  maxValue = Math.max(maxValue, twoWordsSummary[name].added, twoWordsSummary[name].removed);
  totalAdded += twoWordsSummary[name].added;
  totalRemoved += twoWordsSummary[name].removed;
}

console.log("\n" + "".padEnd(60, "=") + "    Contribution Histogram    " + "".padEnd(60, "=") + "\n");
console.log(
  "Name".padEnd(27) +
    "|" +
    "Added".padEnd(8) +
    " |" +
    "%Added".padStart(7) +
    " |" +
    "Removed".padEnd(8) +
    " |" +
    "%Removed".padStart(9) +
    " |" +
    "Added Bar".padEnd(40) +
    " |" +
    "Removed Bar".padEnd(40)
);
console.log(
  "".padEnd(27, "-") +
    "|" +
    "".padStart(8, "-") +
    "-|" +
    "".padStart(7, "-") +
    "-|" +
    "".padEnd(8, "-") +
    "-|" +
    "".padEnd(9, "-") +
    "-|" +
    "".padEnd(40, "-") +
    "-|" +
    "".padEnd(40, "-")
);

for (const name in twoWordsSummary) {
  if (isHiddenContributor(name)) continue;
  const added = twoWordsSummary[name].added;
  const removed = twoWordsSummary[name].removed;
  const percentAdded = totalAdded ? (added / totalAdded) * 100 : 0;
  const percentRemoved = totalRemoved ? (removed / totalRemoved) * 100 : 0;
  // Level bars to exactly 40 chars for the max value
  const addedBarLen = maxValue ? Math.round((added / maxValue) * 40) : 0;
  const removedBarLen = maxValue ? Math.round((removed / maxValue) * 40) : 0;
  const addedBar = "\x1b[32m" + "█".repeat(addedBarLen).padEnd(40) + "\x1b[0m";
  const removedBar = "\x1b[31m" + "█".repeat(removedBarLen).padEnd(40) + "\x1b[0m";
  const nameStr = name.padEnd(27);
  const addedStr = String(added).padStart(8);
  const removedStr = String(removed).padStart(8);
  const percentAddedStr = percentAdded.toFixed(1).padStart(6) + "%";
  const percentRemovedStr = percentRemoved.toFixed(1).padStart(8) + "%";
  console.log(
    `${nameStr}|${addedStr} |${percentAddedStr} |${removedStr} |${percentRemovedStr} | ${addedBar}| ${removedBar}`
  );
}
