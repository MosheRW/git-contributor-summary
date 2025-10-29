#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

// Get directory path from command line argument, default to current directory

let justExisting = process.argv.includes("--exists") || process.argv.includes("-e");
const flagIndex = justExisting ? process.argv.findIndex((arg) => arg === "--exists" || arg === "-e") : -1;

let dirPath = process.cwd();
switch (flagIndex) {
  case 2:
    dirPath = process.argv[3] ? path.resolve(process.argv[3]) : process.cwd();
    break;
  case 3:
  case -1:
    dirPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
    break;
}

function isHiddenContributor(name) {
  // Hide if name is just '-' or similar, or looks like a file path or image or contains '{' or '=>'
  if (/^\s*-+\s*-*\s*$/.test(name)) return true;
  if (/\.(png|jpg|jpeg|gif|svg|bmp)$/i.test(name)) return true;
  if (name.includes("/") || name.includes("\\")) return true;
  if (name.includes("{") || name.includes("=>")) return true;
  return false;
}

function cleanName(name) {
  const nameParts = name.split(" ");
  return nameParts.length >= 2 ? (nameParts[0] + " " + nameParts[1]).toLowerCase() : name.toLowerCase();
}

if (!justExisting) {
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
      const twoWordsName = cleanName(author);

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

  const lineLength = 150;
  const title = "".padEnd(3, " ") + "Contribution Histogram" + "".padEnd(3, " ");
  console.log(
    "\n" +
      "".padEnd((lineLength - title.length) / 2, "=") +
      title +
      "".padEnd((lineLength - title.length) / 2, "=") +
      "\n"
  );
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
} else {
  const files = execSync("git ls-files").toString().trim().split("\n");
  const counts = {};
  let total = 0;
  for (const file of files) {
    try {
      const blame = execSync(`git blame --line-porcelain "${file}"`).toString();
      total += blame.split("\n").filter((line) => line.startsWith("author ")).length;
      for (const line of blame.split("\n")) {
        if (line.startsWith("author ")) {
          const author = cleanName(line.slice(7).trim());
          counts[author] = (counts[author] || 0) + 1;
        }
      }
    } catch {}
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [author, lines] of sorted) {
    console.log(lines.toString().padStart(6), author);
  }

  let maxValue = 0;
  for (const [name, lines] of sorted) {
    if (isHiddenContributor(name)) continue;
    maxValue = Math.max(maxValue, lines);
  }

  console.log("\n" + "".padEnd(29, "=") + "    Contribution Histogram    " + "".padEnd(28, "=") + "\n");
  console.log(
    "Name".padEnd(27) + "|" + "Added".padEnd(8) + " |" + "%Added".padStart(7) + " |" + "Added Bar".padEnd(40)
  );
  console.log(
    "".padEnd(27, "-") + "|" + "".padStart(8, "-") + "-|" + "".padStart(7, "-") + "-|" + "".padEnd(40, "-")
  );

  const totalLength = 88;
  for (const [name, lines] of sorted) {
    if (isHiddenContributor(name)) continue;
    const added = lines;
    const percentAdded = maxValue ? (added / maxValue) * 100 : 0;

    // Level bars to exactly 40 chars for the max value
    const addedBarLen = maxValue ? Math.round((added / maxValue) * 40) : 0;
    const addedBar = "\x1b[32m" + "█".repeat(addedBarLen).padEnd(40) + "\x1b[0m";
    const nameStr = name.padEnd(27);
    const addedStr = String(added).padStart(8);
    const percentAddedStr = percentAdded.toFixed(1).padStart(6) + "%";
    console.log(`${nameStr}|${addedStr} |${percentAddedStr} | ${addedBar}|`);
  }
  console.log("".padEnd(totalLength, "="));
  const totalString = "Total lines in repo: " + total;
  console.log(
    "\n" +
      "".padEnd((totalLength - totalString.length) / 2, " ") +
      totalString +
      "".padEnd((totalLength - totalString.length) / 2, " ") +
      "\n"
  );
  console.log("".padEnd(totalLength, "="));

}
