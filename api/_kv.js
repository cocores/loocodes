// Talks to Vercel KV / Upstash Redis over its REST API using plain fetch,
// so these functions need no npm dependencies at the repo root.
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kvCommand(command) {
  if (!URL || !TOKEN) {
    throw new Error(
      "No KV store connected. In the Vercel dashboard, add a KV/Redis database " +
        "(Storage tab) and connect it to this project, then redeploy.",
    );
  }

  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KV request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.result;
}

module.exports = { kvCommand };
