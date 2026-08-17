import { mkdir, writeFile } from "node:fs/promises";

const username = process.env.GITHUB_USERNAME || "unseoJang";
const token = process.env.GITHUB_TOKEN;

const now = new Date();
const from = new Date(now);
from.setFullYear(now.getFullYear() - 1);

async function getContributionStats() {
  if (!token) {
    return null;
  }

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
          }
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": `${username}-profile-pet`,
    },
    body: JSON.stringify({
      query,
      variables: {
        login: username,
        from: from.toISOString(),
        to: now.toISOString(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  }

  const payload = await response.json();
  const collection = payload.data?.user?.contributionsCollection;

  if (!collection) {
    throw new Error("Missing contribution collection");
  }

  return {
    total: collection.contributionCalendar.totalContributions,
    commits: collection.totalCommitContributions,
    issues: collection.totalIssueContributions,
    prs: collection.totalPullRequestContributions,
    reviews: collection.totalPullRequestReviewContributions,
  };
}

function getPet(total) {
  const level = Math.max(1, Math.floor(total / 120) + 1);
  const xp = total % 120;
  const progress = Math.round((xp / 120) * 100);

  if (level >= 9) {
    return { level, progress, stage: "Senior", mood: "Focused", color: "#70a5fd" };
  }

  if (level >= 5) {
    return { level, progress, stage: "Junior", mood: "Curious", color: "#8b5cf6" };
  }

  if (level >= 2) {
    return { level, progress, stage: "Baby", mood: "Growing", color: "#20c997" };
  }

  return { level, progress, stage: "Egg", mood: "Hatching", color: "#fbbf24" };
}

function renderSvg(stats) {
  const data = stats || { total: 0, commits: 0, issues: 0, prs: 0, reviews: 0 };
  const pet = getPet(data.total);
  const barWidth = Math.max(8, Math.round((pet.progress / 100) * 260));

  return `<svg width="720" height="230" viewBox="0 0 720 230" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">${username}'s GitHub pet</title>
  <desc id="desc">A profile pet that levels up from GitHub contributions.</desc>
  <style>
    .title { font: 700 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #f8fafc; }
    .label { font: 600 15px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #cbd5e1; }
    .muted { font: 500 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #94a3b8; }
    .stat { font: 700 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #f8fafc; }
    .pixel { shape-rendering: crispEdges; }
  </style>
  <rect width="720" height="230" rx="16" fill="#0f172a"/>
  <rect x="1" y="1" width="718" height="228" rx="15" stroke="#334155" stroke-width="2"/>
  <circle cx="103" cy="103" r="62" fill="#111827" stroke="${pet.color}" stroke-width="4"/>
  <g class="pixel" transform="translate(57 51)">
    <rect x="18" y="8" width="14" height="14" fill="${pet.color}"/>
    <rect x="60" y="8" width="14" height="14" fill="${pet.color}"/>
    <rect x="10" y="22" width="74" height="56" rx="8" fill="${pet.color}"/>
    <rect x="24" y="40" width="10" height="10" fill="#0f172a"/>
    <rect x="58" y="40" width="10" height="10" fill="#0f172a"/>
    <rect x="42" y="54" width="8" height="8" fill="#0f172a"/>
    <rect x="34" y="68" width="24" height="6" rx="3" fill="#0f172a" opacity="0.65"/>
    <rect x="2" y="44" width="8" height="30" rx="4" fill="${pet.color}"/>
    <rect x="84" y="44" width="8" height="30" rx="4" fill="${pet.color}"/>
    <rect x="22" y="78" width="16" height="12" rx="4" fill="${pet.color}"/>
    <rect x="56" y="78" width="16" height="12" rx="4" fill="${pet.color}"/>
  </g>
  <text x="195" y="54" class="title">GitHub Pet</text>
  <text x="195" y="84" class="label">Stage: ${pet.stage} · Level ${pet.level} · ${pet.mood}</text>
  <text x="195" y="111" class="muted">Commits and contributions feed this pet every day.</text>
  <rect x="195" y="132" width="260" height="16" rx="8" fill="#1e293b"/>
  <rect x="195" y="132" width="${barWidth}" height="16" rx="8" fill="${pet.color}"/>
  <text x="466" y="145" class="muted">${pet.progress}% to next level</text>
  <g>
    <rect x="195" y="166" width="105" height="42" rx="10" fill="#111827" stroke="#334155"/>
    <text x="211" y="187" class="muted">Total</text>
    <text x="211" y="203" class="stat">${data.total}</text>
    <rect x="316" y="166" width="105" height="42" rx="10" fill="#111827" stroke="#334155"/>
    <text x="332" y="187" class="muted">Commits</text>
    <text x="332" y="203" class="stat">${data.commits}</text>
    <rect x="437" y="166" width="105" height="42" rx="10" fill="#111827" stroke="#334155"/>
    <text x="453" y="187" class="muted">PRs</text>
    <text x="453" y="203" class="stat">${data.prs}</text>
    <rect x="558" y="166" width="105" height="42" rx="10" fill="#111827" stroke="#334155"/>
    <text x="574" y="187" class="muted">Reviews</text>
    <text x="574" y="203" class="stat">${data.reviews}</text>
  </g>
</svg>`;
}

let stats = null;

try {
  stats = await getContributionStats();
} catch (error) {
  console.error(error);
}

await mkdir("dist", { recursive: true });
await writeFile("dist/profile-pet.svg", renderSvg(stats));
