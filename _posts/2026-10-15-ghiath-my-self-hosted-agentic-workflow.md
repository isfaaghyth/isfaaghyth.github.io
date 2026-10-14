---
title: Ghiath, My Self-Hosted Agentic Workflow
emoticon: 🤖
toc: true
date: 2026-07-23T09:00:00.000Z
categories:
  - exploration
tags:
  - ai
  - agentic
  - harness
  - harmes
---

For a long time my "AI workflow" was a pile of browser tabs. One chat for work, another for household things, notes scattered between Obsidian and Telegram saved messages, and reminders I set in three different apps and still missed. Every new model release made the chat smarter, but it never made the chat _remember_ anything about my life.

So I stopped looking for a better chat and started building a small system around the models instead. It runs on my own hardware, I talk to it from Telegram, and it writes everything it knows into plain Markdown that I can open in Obsidian. The models are GLM 5.1 (for the technical work agent) and DeepSeek v4 Flash (for the household agent), routed through my own gateway. The goal was simple: two assistants I actually use every day, and my own agentic workflow: _Ghiath_.

The code is public at [github.com/isfaaghyth/ghiath](https://github.com/isfaaghyth/ghiath).

## Why Build This

Two parts of my day need help, and they should never mix. Work is technical: research, planning, editing files, running commands. Home is shared with my partner: reminders, lists, appointments, quick questions. I wanted my partner to be able to message the home assistant without ever seeing a single work note.

It is also a good technical test. Memory, semantic search, sync across devices, push alarms, and a safety gate before an agent touches anything: that is most of what people mean by "agentic", but at a size one person can understand and maintain.

One honest note before anything else, taken straight from the README: Ghiath is for light, personal use. There is no planner, no task graph, no retry or escalation logic, no orchestration across agents. That is a choice, not a missing feature.

## What We Discovered

### More Agents Was Not Better

The first version of Ghiath was a team of three role agents (assistant, engineer, researcher) behind an n8n router. It looked impressive on a diagram. In practice the router was one more thing to debug, and handoffs between agents lost context more often than they helped.

What I actually needed was one agent per side of life:

| Agent    | Who talks to it   | Model             | Vault         |
| -------- | ----------------- | ----------------- | ------------- |
| **work** | Me alone          | GLM 5.1           | `vault-work/` |
| **home** | Me and my partner | DeepSeek v4 Flash | `vault-home/` |

The work agent does the whole job itself: thinking, researching, planning, and executing. The home agent handles household things and never assumes which of us is talking to it. There is no router, no lead agent and no handoff. n8n is still in `docker-compose.yml` as an optional add-on, but nothing depends on it.

### Isolation Has to Be Physical, Not a Prompt

I first assumed "please do not read work notes" in a system prompt would be enough. It is not a boundary, it is a request. So the two agents share nothing:

- separate hermes profiles
- separate vaults on disk
- separate Qdrant collections (`vault_work`, `vault_home`), so semantic search cannot cross
- separate CouchDB databases (`ghiath`, `ghiath-home`), so my partner's phone only ever syncs the home vault
- separate Telegram bots
- separate ntfy topics for alarms

The household bot simply has no path to the work vault.

### The Agent Must Ask Before It Acts

Letting an agent run commands from a Telegram message is scary. The fix is the confirmation gate: the work agent plans out loud, stops, and does nothing until I reply "go". Reading, searching and explaining are not gated, so questions still get answered immediately. One confirmation covers one plan and never becomes a standing permission.

### Alarms Do Not Need an LLM

Reminders were the feature I used most, and the first design ran them through n8n workflows. It turned out the LLM is only needed once: to understand "remind me to pick up the laundry at 5" and write a note. After that, firing the alarm is a plain script on a cron. No model, no workflow engine, nothing to hallucinate.

## Architecture

```
   Telegram (work bot)                    Telegram (home bot)
            |                                      |
            v                                      v
   +------------------+                   +------------------+
   |   work agent     |                   |   home agent     |
   |   (hermes)       |                   |   (hermes)       |
   +--------+---------+                   +---------+--------+
            |                                       |
            v                                       v
   +------------------+                   +------------------+
   |   vault-work/    |                   |   vault-home/    |
   |   (Markdown)     |                   |   (Markdown)     |
   +--+------------+--+                   +--+------------+--+
      |            |                         |            |
 embeds|           |replicates         embeds|            |replicates
      v            v                         v            v
 +---------+  +----------+             +---------+  +----------+
 | Qdrant  |  | CouchDB  |             | Qdrant  |  | CouchDB  |
 +---------+  +----------+             +---------+  +----------+

  Agent LLM calls  ->  KeiRouter (gateway, holds the provider keys)
  Reminder alarms  ->  hermes cron -> ntfy -> phone
  Public HTTPS     ->  Caddy (per-subdomain reverse proxy, VPS only)
```

Each piece has one job:

- **hermes** runs the agents on the host, with native Telegram support and its own cron.
- **The vaults** are plain Markdown folders. They are the long-term memory, and they are gitignored (`vault*/`), so a note can never be pushed.
- **Qdrant** plus a small indexer sidecar give semantic search over each vault.
- **CouchDB** with Obsidian Self-hosted LiveSync puts the same vault on my laptop and phone.
- **KeiRouter** is the only place that holds provider keys.
- **ntfy** delivers alarms that break through Do Not Disturb.
- **Caddy** adds HTTPS, and only on the VPS.

## How to Do It Yourself

You need Docker and Docker Compose, `openssl`, Obsidian, macOS or Linux for the hermes host install, and an OpenRouter or Anthropic API key (added to KeiRouter, never committed).

### 1. Clone and Name Your Agents

```bash
git clone https://github.com/isfaaghyth/ghiath
```

```bash
cp agents.conf.example agents.conf
```

### 2. Start the Stack

`make bootstrap` generates secrets, starts couchdb, livesync-bridge, qdrant, both indexers, keirouter and ntfy, then initializes CouchDB.

```bash
make bootstrap
```

```bash
make test
```

### 3. Install hermes on the Host

hermes runs on the host, not in Docker.

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

### 4. Connect KeiRouter

Open the dashboard at `http://localhost:20180`, change the default password, add your provider key, then mint a client key for the agents:

```bash
docker compose exec keirouter keirouter bootstrap -key-name ghiath-agents
```

### 5. Provision the Two Agents

Create two bots with @BotFather, put `WORK_TELEGRAM_BOT_TOKEN` and `HOME_TELEGRAM_BOT_TOKEN` in `.env`, then:

```bash
./scripts/hermes.sh <keirouter-virtual-key>
```

**Warning:** after the first message, set `platforms.telegram.allowed_chats` in `~/.hermes/profiles/<agent>/config.yaml`. Until you do, anyone who finds the bot can talk to it.

### 6. Register the Reminder Tick

```bash
make seed-cron
```

```bash
hermes cron create '*/1 * * * *' --no-agent --script reminder-tick.py --deliver telegram --name ghiath-reminders
```

The phone side of ntfy (accounts, topic access, "Override Do Not Disturb") is in [REMINDERS.md](https://github.com/isfaaghyth/ghiath/blob/main/REMINDERS.md).

## Building It, Step by Step

### agents.conf, One Source of Truth

Both agents are described in one file. `scripts/hermes.sh` reads it to provision the hermes profiles, and `scripts/sync-env.sh` projects the vault and collection names into `.env` for Docker Compose.

```bash
WORK_NAME="work"
WORK_MODEL="z-ai/glm-5.1"
WORK_PORT="8642"
WORK_VAULT="vault-work"
WORK_COLLECTION="vault_work"
WORK_CONFIRM_GATE="1"

HOME_NAME="home"
HOME_MODEL="deepseek/deepseek-v4-flash"
HOME_PORT="8645"
HOME_VAULT="vault-home"
HOME_COLLECTION="vault_home"
```

### scripts/hermes.sh, the Confirmation Gate

The gate is not code that intercepts tool calls. It is a block written into the work agent's `SOUL.md`, only when `WORK_CONFIRM_GATE` is `1`:

```bash
# The confirmation gate. This is the whole point of the work agent's design:
# it plans out loud, stops, and does not touch anything until told to go.
confirm_gate() {
	cat <<'EOF'

## Confirmation gate (MANDATORY)

Before you execute any technical task, you STOP and ask for confirmation in the
same Telegram chat, then wait for the reply.
# ...
1. PLAN. Reply with a short plan: what you understood the request to be, the
   exact steps you intend to take, and which files or services each step
   touches. Ten lines at most. Do not begin any of it.
2. ASK. End that message with exactly this line, on its own:
   Confirm to proceed? (reply "go")
3. WAIT. Do nothing at all until you get a reply. If the reply is anything other
   than a clear go-ahead, treat it as "no": answer what was asked or revise the
   plan, then ask again.
4. EXECUTE. Once confirmed, carry out the plan you showed - that plan only.
```

The same script is idempotent and non-destructive. It creates a profile only if it is missing and otherwise reconfigures it in place, so sessions, memories and Telegram bindings survive every deploy. The destructive path exists, but only behind `--reset`.

### qdrant-indexer/indexer.py, Memory You Can Search

A sidecar watches each vault, splits notes into chunks, embeds them locally with fastembed and upserts them into that vault's collection. The chunker is deliberately simple: split on blank lines, then pack paragraphs up to 1500 characters.

```python
def chunk_markdown(text: str, max_chars: int = 1500) -> list[str]:
    """Split on blank lines, then greedily pack paragraphs up to max_chars."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if not current:
            current = para
        elif len(current) + len(para) + 2 <= max_chars:
            current = f"{current}\n\n{para}"
        else:
            chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks
```

When a note gets shorter, the indexer deletes leftover higher index chunks, so old text never lingers in search results.

### skills/reminders/SKILL.md, Choosing the Channel

The `reminders` skill is seeded into both agents. It picks between an urgent ntfy alarm and a Google Calendar event, and asks when the request is unclear:

```markdown
1. If the user **explicitly names a channel** (alarm/notify/wake/ping ⇒ ntfy;
   calendar/schedule/event/book ⇒ Google Calendar), use that one. Do not ask.
2. If the request implies urgency but names no channel ("make sure I don't miss
   ..."), default to the **alarm**.
```

For an alarm, the agent only writes a note to `<vault>/reminders/<id>.md` with `status: scheduled`. That is the last moment an LLM is involved.

### scripts/hermes-cron/reminder-tick.py, the Alarm Loop

hermes cron runs this every minute in `--no-agent` mode. Anything printed to stdout goes to Telegram, so the script stays silent except on the first fire. The core of it is a small state machine per note: `scheduled` becomes `firing`, `firing` keeps nagging until the acknowledge window ends, then becomes `missed`.

```python
if status == "scheduled" and now >= when_ts:
    do_send = first_fire = True
    new_status = "firing"
    fired_at = datetime.now(timezone.utc).isoformat()
elif status == "firing":
    try:
        fired_ts = datetime.fromisoformat(fired_at).timestamp()
    except ValueError:
        fired_ts = now
    if now <= fired_ts + ack_window * 60:
        do_send = True  # keep nagging
    else:
        new_status = "missed"
else:
    continue
```

It scans both vaults, and each vault publishes to its own topic. The script even warns if someone sets both topics to the same name, because that would ring work reminders on my partner's phone:

```python
work_topic = env.get("NTFY_TOPIC") or "ghiath-work-alarm"
home_topic = env.get("NTFY_HOME_TOPIC") or "ghiath-home-alarm"
if work_topic == home_topic:
    log(f"WARNING: work and home ntfy topics are both '{work_topic}'; "
        "household reminders will ring on the work subscription too")
```

### Updating Without Losing State

A deploy must never cost a Telegram login, a session or a note. The normal update is safe to run on a live box:

```bash
git pull
make sync-env
docker compose up -d
make agents
make test
```

---

## Ghiath!

What I have now:

- **2** agents, fully isolated, each with its own Telegram bot.
- **2** Markdown vaults that sync to my devices (and only the home one to my partner's).
- **1** gateway holding every provider key, with per agent spend tracking.
- Alarms that fire every minute until acknowledged, with no LLM in the loop.
- A work agent that will not change anything until I reply "go".

### Limitations

- It is built for light personal use. No loop engineering, no retries, no multi agent orchestration.
- The confirmation gate lives in the prompt. It works with the models I use, but it is an instruction, not a sandbox.
- Model slugs drift. After adding provider keys, check them with `hermes model --refresh`.
- The Telegram bots are open until you set `allowed_chats`.

### What Comes Next

For heavier work, with real loop engineering, I am building a separate project: [ghiath-loop](https://github.com/isfaaghyth/pang). Ghiath itself will stay small on purpose.
