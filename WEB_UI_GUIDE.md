# Microsoft Rewards Script - Complete Beginner's Guide

A start-to-finish guide to installing and using this tool through its new **Web UI**. No coding experience needed. Every command is something you copy, paste, and press Enter on.

---

## Table of Contents

1. [What this tool actually does](#1-what-this-tool-actually-does)
2. [Prerequisites and system requirements](#2-prerequisites-and-system-requirements)
3. [Environment setup (one time only)](#3-environment-setup-one-time-only)
4. [Starting the Web UI](#4-starting-the-web-ui)
5. [How to use the Web UI](#5-how-to-use-the-web-ui)
6. [Optional: turning on scheduling](#6-optional-turning-on-scheduling)
7. [Troubleshooting](#7-troubleshooting)
8. [Safety and privacy notes](#8-safety-and-privacy-notes)

---

## 1. What this tool actually does

Think of it as **a robot that uses a web browser for you**.

You normally earn Microsoft Rewards points by searching on Bing, clicking daily
cards, and reading articles. This tool opens a real browser, signs in as you,
and does that clicking and searching itself.

There are three pieces. It helps to picture them like a restaurant:

| Piece          | Restaurant analogy | What it really is                                       |
| -------------- | ------------------ | ------------------------------------------------------- |
| **The bot**    | The chef           | The part that opens browsers and collects points        |
| **The server** | The waiter         | A small program that takes your orders and reports back |
| **The Web UI** | The menu           | The page you click on in your browser                   |

You will mostly only touch **the menu** (the Web UI). But the waiter has to be
awake for the menu to work, which is why you will start the server in Step 4 and
leave it running.

---

## 2. Prerequisites and system requirements

### What your computer needs

- **Windows, macOS, or Linux.** Any of them is fine.
- **About 2 GB of free disk space.** The tool downloads its own private copy of
  a browser, which is most of that.
- **An internet connection.**
- **A screen.** For your very first sign-in you need to see a browser window, so
  this doesn't work on a screen-less server for that one step.

### What you need to have ready

- **A Microsoft account** that already has Rewards enabled. Sign in at
  [rewards.bing.com](https://rewards.bing.com) once in your normal browser and
  make sure it works before automating it.
- **Your account's email address.**
- **Your password** _only if_ your account signs in with a password. If you use
  the Microsoft Authenticator app with no password, you can skip it.
- **20 to 30 minutes** for the one-time setup. Most of that is waiting for
  downloads.

### Software you will install

Just one thing: **Node.js**, version 24 or newer. Step 3 walks you through it.

Node.js is the engine this tool runs on. Nothing about it requires you to write
code, the same way driving a car doesn't require you to build an engine.

> **A note on comfort level:** you will be typing commands into a black window
> (the "terminal"). That is normal and expected. You are not programming. You are
> giving short instructions, like typing a web address into a browser.

---

## 3. Environment setup (one time only)

Do these five steps in order. Each one builds on the last.

### Step 3.1 - Install Node.js

**On Windows:**

1. Go to **[nodejs.org](https://nodejs.org)**.
2. Download the **LTS** version (the big green button). Make sure the version
   number starts with **24** or higher.
3. Open the downloaded file and click **Next** through the installer. The default
   options are correct, do not change anything.
4. When it finishes, restart your computer. This matters. Windows needs a restart
   to notice that Node.js exists.

**On macOS:** download the LTS `.pkg` installer from
[nodejs.org](https://nodejs.org) and run it.

**On Linux:** use [nodesource](https://github.com/nodesource/distributions) or
your package manager, and confirm you get version 24 or newer.

**Check that it worked.** Open a terminal:

- **Windows:** press the **Windows key**, type `powershell`, press Enter.
- **macOS:** press **Cmd+Space**, type `terminal`, press Enter.
- **Linux:** press **Ctrl+Alt+T**.

Type this and press Enter:

```bash
node --version
```

You should see something like `v24.5.0`. If you see "command not found", Node.js
did not install correctly, or you skipped the restart.

> **If the number is lower than 24**, you have an old Node.js. Install the new
> one over it using the steps above.

### Step 3.2 - Get the tool onto your computer

**The easy way (no Git needed):**

1. Go to the project's GitHub page.
2. Click the green **Code** button, then **Download ZIP**.
3. Right-click the downloaded ZIP and choose **Extract All**.
4. Move the extracted folder somewhere you'll remember, like your Documents
   folder.

> **Avoid folders synced by OneDrive, Dropbox, or Google Drive if you can.**
> They sometimes lock files while the tool is writing to them, which causes
> confusing errors.

### Step 3.3 - Point your terminal at the folder

Your terminal needs to be "inside" the project folder, the way File Explorer is
inside a folder when you double-click it.

**The easiest method on Windows:**

1. Open the project folder in File Explorer.
2. Click the address bar at the top (where the folder path is shown).
3. Type `powershell` and press Enter.

A terminal opens already pointed at the right place.

**Any platform:** type `cd ` (with a space), then drag the folder from your file
manager onto the terminal window, then press Enter.

**Check that you're in the right place:**

```bash
ls
```

You should see file names including `package.json` and `config.example.json`. If
you don't, you're in the wrong folder.

> **Keep this terminal open.** Every command from here on gets typed into it.

### Step 3.4 - Install the tool's parts

Type this and press Enter:

```bash
npm run pre-build
```

**This takes a while.** Five to fifteen minutes is normal. It is downloading the
tool's private browser, which is a few hundred megabytes.

You will see a lot of scrolling text. That's fine. Warnings in yellow are
normal and safe to ignore. Only stop and worry if it ends with the word `error`
and nothing else happens.

Then run:

```bash
npm run build
```

This one is quick, usually under a minute. It converts the project's source
files into the form the computer actually runs.

> **Remember this command.** Any time you change the project's files, you run
> `npm run build` again to apply the change.

### Step 3.5 - Create your two settings files

The project ships **example** settings files. You make your own copies and fill
them in. The examples are templates, like a blank form.

**File 1: `config.json`** - controls how the bot behaves.

Find the file named `config.example.json` in the project folder. **Copy** it, and
rename the copy to exactly `config.json`.

- Windows: right-click → Copy, right-click → Paste, then rename
  `config.example - Copy.json` to `config.json`.
- Make sure the name is exactly `config.json`, with no "example" and no "copy".

You do not need to edit anything inside it. The defaults are fine.

**File 2: `.env`** - holds your account email and password.

Find the file named `env.example`. Copy it and rename the copy to exactly
`.env` - starting with a dot, and with **no** file extension.

> **Windows tip:** Explorer may refuse to let you name a file starting with a
> dot. Work around it by naming it `.env.` **with a trailing dot** - Windows
> strips that automatically and leaves you with `.env`.

Now open `.env` in **Notepad** (right-click → Open with → Notepad). You'll see
lines like this:

```env
ACCOUNT_1_EMAIL=email@example.com
#ACCOUNT_1_PASSWORD=your_password
```

Change the email to your real one. If your account uses a password, delete the
`#` at the start of the password line and put your real password in:

```env
ACCOUNT_1_EMAIL=your.real.email@outlook.com
ACCOUNT_1_PASSWORD=YourRealPassword
```

**The `#` means "ignore this line."** Removing it switches the line on.

If your account uses the Authenticator app instead of a password, leave the
password line alone with its `#`. The tool handles that.

Save the file and close Notepad.

> **If you use two-factor authentication**, there's a line for
> `ACCOUNT_1_TOTP_SECRET`. Filling it in lets the tool generate your 6-digit
> codes automatically. To get the value: in your Microsoft security settings,
> open "Manage how you sign in", add an authenticator app, and when the QR code
> appears choose **"enter code manually"**. Paste that code as the value.

**Setup is done.** You never have to repeat Steps 3.1 through 3.5.

---

## 4. Starting the Web UI

Two steps: wake up the server, then open the page.

### Step 4.1 - Start the server

In your terminal (still inside the project folder), run:

```bash
npm run api
```

You'll see a few lines of startup text and then the terminal will appear to
**hang**, showing no new output and no prompt.

**That is correct.** The server is now running and listening. It's supposed to
sit there. The terminal is not frozen.

> **Leave this terminal window open and do not close it.** Closing it turns the
> server off, and the Web UI stops working. Minimize it instead.

### Step 4.2 - Open the page

Open your normal web browser (Chrome, Edge, Firefox, whatever you use) and go to:

```
http://127.0.0.1:3010
```

`127.0.0.1` always means "this computer." You're not visiting the internet, just
your own machine.

You should see the **Microsoft Rewards Control** dashboard.

Look at the top right. There's a **Server** badge:

| Badge       | Meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| **Online**  | Server is awake, nothing running. This is what you want.    |
| **Running** | A run is in progress right now.                             |
| **Offline** | The page can't reach the server. Check Step 4.1's terminal. |

If it says Offline, your server terminal is probably closed or errored out.

### Every time after today

Starting the tool is just those two steps:

1. Open a terminal in the project folder, run `npm run api`
2. Open `http://127.0.0.1:3010`

---

## 5. How to use the Web UI

The page is a single column of sections, top to bottom. Here's each one.

### 5.1 - Add Account

The box at the top. Type an email address and click **Add Account**.

This writes the email into your `.env` file for you, so you don't have to edit
that file by hand again. The account appears in the list immediately.

> **Important: the UI never asks for your password, on purpose.** Passwords only
> ever live in your `.env` file on your own disk. If the account you just added
> needs a password, open `.env` in Notepad and add a matching line. For an
> account added as `ACCOUNT_2`, the line is `ACCOUNT_2_PASSWORD=yourpassword`.

### 5.2 - Account Overview

Four counters showing the health of your accounts.

| Counter            | What it means                                                   |
| ------------------ | --------------------------------------------------------------- |
| **Total Accounts** | How many accounts the tool knows about                          |
| **Logged In**      | Has a valid saved sign-in. Ready to run.                        |
| **Not Logged In**  | Has never signed in. Needs the step below.                      |
| **Login Expired**  | Was signed in, but the saved sign-in went stale. Sign in again. |

**A brand new account starts as "Not Logged In." That's expected.**

### 5.3 - First sign-in for a new account

Microsoft will not let a robot get through a fresh sign-in cleanly, so you do
the first one yourself. Once. It gets saved after that.

Open a **second** terminal in the project folder (leave the server one alone)
and run this, with your own email:

```bash
npm run manual-login -- --email your.real.email@outlook.com
```

A browser window opens. Sign in normally, exactly like any other day, including
any 2FA prompt. When you land on the Rewards page, **wait about five seconds**.
The window closes by itself and your sign-in is saved.

Back on the dashboard, that account flips to **Logged In** within a few seconds.

> Do this again whenever an account shows **Login Expired**. It's the standard
> fix for almost every sign-in problem.

### 5.4 - Execution Settings

Four controls that decide _how_ the next run behaves. **Set these before you
press Run.** Your choices are remembered in your browser for next time.

**Run in Headless Mode**

- **Off** (default): you see the browser windows open and click around.
- **On**: everything happens invisibly in the background.

Off is better while you're learning, because you can see what's happening. On is
better once you trust it, so windows don't steal focus while you work.

> Don't use headless for a first sign-in. Use `manual-login` from Section 5.3.

**Run Visual Search**

Off by default. Turn it on to also do Bing Visual Search tasks (the ones where
you search using a picture instead of words) for extra daily points.

**Run 30-Minute Edge Browsing**

Off by default. Turn it on to complete the Edge browsing reward, where the tool
browses in the background for half an hour.

> **This makes the run take at least 30 minutes longer.** That's the reward's
> own requirement, not the tool being slow. It's marked experimental because
> Microsoft changes how it works from time to time.

**Schedule for Later**

A date and time picker. Leave it **empty** to run right now. Fill it in only if
you're using the Schedule Run button (see Section 5.7).

### 5.5 - Ready to Execute

Your account list, plus the action buttons.

Each account row shows a **checkbox**, the **email**, how many **runs** it has
done, when it **last** ran, its **points**, and a **status badge**.

**How to run:**

1. **Tick the checkbox** on each account you want to run. Or click **Select All**
   to tick everything (it turns into **Deselect All**).
2. Double-check your toggles in Execution Settings.
3. Click **Run Selected**.

A small message slides in confirming the start, the Server badge flips to
**Running**, and log lines start appearing at the bottom of the page.

**What to expect:** a full run takes a while, commonly 20 to 60 minutes per
account, longer with Edge Browsing on. The tool deliberately pauses between
actions so it behaves like a person rather than a machine. Slow is intentional.

**The Stop button** is greyed out unless something is actually running. Click it
to end the run: it asks the bot to shut its browsers down cleanly, and if the bot
doesn't respond in time the server force-closes it. No orphaned browser windows
left behind either way.

**The Remove button** takes an account off this list, but it **does not delete it
from your `.env` file**, so it will reappear on the next refresh. To remove an
account for good, open `.env` in Notepad and delete its `ACCOUNT_N_EMAIL` line.

### 5.6 - Scheduled Tasks

Lists runs you've queued for a future time. Each entry shows the time, which
accounts, and a **Cancel** button.

### 5.7 - How to schedule a run

1. Tick the accounts you want.
2. Set the date and time in **Schedule for Later**. It must be in the future,
   and it's your computer's local clock.
3. Click **Schedule Run**.

**Two things have to be true for a scheduled run to actually fire:**

- Scheduling must be switched on. It's **off by default** as a safety measure.
  See [Section 6](#6-optional-turning-on-scheduling). If it's off, you'll get an
  error message mentioning `API_ALLOW_SCHEDULE_WRITE`.
- **Your server terminal must still be running when the time arrives**, and your
  computer must be awake. Nothing can start a run if the waiter has gone home.

### 5.8 - Live Logs

The black console at the bottom. This is the bot narrating what it's doing, live.

Each line has a timestamp, a level, and a message. The level is the useful part:

| Level     | Colour | What it means                                       |
| --------- | ------ | --------------------------------------------------- |
| **INFO**  | Normal | Routine progress. Ignore these.                     |
| **WARN**  | Yellow | Something was skipped or retried. Usually harmless. |
| **ERROR** | Red    | Something actually failed. Worth reading.           |

**Auto-scroll** (on by default) keeps the newest line in view. Turn it off when
you want to scroll up and read something without being yanked back down.

**Clear** empties the display. It only clears your view, not the server's
records, so reloading the page brings recent history back.

The console keeps the most recent 500 lines and replays the last 100 when you
open the page, so you don't come back to a blank screen.

**When something goes wrong, this is the first place to look.** Scroll to the
red lines and read the message.

---

## 6. Optional: turning on scheduling

Scheduling is disabled by default so that nothing can queue up runs on your
machine without you deliberately allowing it. Turning it on is a one-line
change.

1. Stop the server: click its terminal window and press **Ctrl+C**.
2. Open your `.env` file in Notepad.
3. Add this line at the bottom:

```env
API_ALLOW_SCHEDULE_WRITE=true
```

4. Save and close.
5. Start the server again with `npm run api`.

**Schedule Run** now works.

---

## 7. Troubleshooting

### The page says "Offline"

The server isn't running or isn't reachable.

- Check the terminal where you ran `npm run api`. Still open? Any red text?
- If it's closed, run `npm run api` again.
- Confirm the address is exactly `http://127.0.0.1:3010`.

### "Port 3010 is already in use"

A server is already running, probably from earlier. Either use the one that's
already up (just open the page), or close the other terminal window and try
again.

### An account is stuck on "Not Logged In" or "Login Expired"

Run the manual sign-in from Section 5.3. This fixes the large majority of
sign-in problems.

```bash
npm run manual-login -- --email your.real.email@outlook.com
```

If it keeps expiring, delete the saved sessions and start clean:

```bash
npm run clear-sessions -- email your.real.email@outlook.com
```

Then sign in manually again.

### "No accounts configured in .env yet"

The email is in your browser's list but not in the `.env` file. Add it again
through the **Add Account** box, which writes the file for you.

### Run Selected does nothing

- Did you tick at least one checkbox? Selecting accounts is separate from
  running them.
- Is the badge showing **Running**? Only one run happens at a time, so the
  button is disabled while one is in progress.

### Visual Search or Edge Browsing didn't happen

Confirm the toggle was **on before** you clicked Run Selected, not after. Then
check the Live Logs for a line like:

```
[Config] override: CONFIG_WORKER_VISUAL_SEARCH -> .workers.doVisualSearch = true
```

That line is the tool confirming it received your toggle. If it's there, the
feature was switched on for that run. If a feature still gets skipped after
that, the log will say why just below it, usually that the account had no such
task available that day.

### A command failed with lots of red text

Try, in order:

1. `npm run build` and then retry.
2. If that fails, `npm run pre-build` followed by `npm run build`.
3. Check that `config.json` and `.env` both exist and are named exactly right. A
   missing `config.json` is one of the most common causes.

### Browser windows were left open after a crash

On Windows:

```bash
npm run kill-chrome-win
```

---

## 8. Safety and privacy notes

**Your credentials stay on your machine.** Passwords live only in your `.env`
file on your own disk. The Web UI never asks for them, never displays them, and
never sends them anywhere. Never share your `.env` file, and never post it in a
screenshot or a support thread.

**The dashboard has no password on it by default.** It's bound to `127.0.0.1`,
which means only programs on your own computer can reach it. Anyone else on your
Wi-Fi cannot. That's a deliberate default.

If you ever change the server to listen on your network (with something like
`--host 0.0.0.0`), **set a token first**, or anyone on that network can start
runs on your accounts. Add a line like `API_TOKEN=some-long-random-string` to
your `.env` before doing that.

**Don't put `.env` or `config.json` into a public GitHub repository.** The
project already tells Git to ignore both, so this only happens if you go out of
your way. Just don't.

**About the risk to your account.** Automating Microsoft Rewards is against
Microsoft's terms of service. Accounts do get suspended or banned for it. This
tool tries to behave like a person, with realistic delays, but there is no
guarantee. Use it on an account you can afford to lose, and understand you're
accepting that risk yourself.

---

## Quick reference

**Daily startup:**

```bash
npm run api
```

Then open `http://127.0.0.1:3010`.

**Common commands:**

| Command                                           | What it does                           |
| ------------------------------------------------- | -------------------------------------- |
| `npm run api`                                     | Starts the server for the Web UI       |
| `npm run build`                                   | Applies changes you've made to files   |
| `npm run manual-login -- --email you@example.com` | Signs an account in by hand            |
| `npm run clear-sessions -- list`                  | Shows saved sign-ins                   |
| `npm run clear-sessions -- email you@example.com` | Deletes one account's saved sign-in    |
| `npm run kill-chrome-win`                         | Closes stuck browser windows (Windows) |

**Key files:**

| File          | Holds                                      |
| ------------- | ------------------------------------------ |
| `.env`        | Your emails, passwords, and server options |
| `config.json` | How the bot behaves                        |

**Keyboard:** **Ctrl+C** in the server terminal stops the server.
