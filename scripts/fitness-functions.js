/**
 * Architecture fitness functions — enforce multi-tenancy and patterns.
 * Run in CI before merge.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const violations = [];

// Check 1: New migration files have facility_id on new tables
try {
  const migrations = execSync(
    "git diff --name-only HEAD~1 -- supabase/migrations/",
    { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const file of migrations) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    if (content.includes("CREATE TABLE") && !content.includes("facility_id") && !content.includes("audit_log")) {
      violations.push(`New table missing facility_id: ${file}`);
    }
  }
} catch {
  // No migrations in diff
}

// Check 2: No direct createClient in app/components (use hooks/context)
const componentsDir = path.join(process.cwd(), "app", "components");
if (fs.existsSync(componentsDir)) {
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (f.endsWith(".tsx") || f.endsWith(".ts")) {
        const content = fs.readFileSync(full, "utf-8");
        if (content.includes("createClient()") && !content.includes("use client")) {
          violations.push(`Direct DB call in component: ${full}`);
        }
      }
    }
  };
  walk(componentsDir);
}

if (violations.length > 0) {
  console.error("Fitness function violations:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("All fitness checks passed.");
