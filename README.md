# Xenon Discord Bot

Xenon is a Discord bot designed to help manage an esports team's Discord server. Though it is still in its early stages, I plan to enhance its features to meet the needs of any esports team.

## Getting Started

### Prerequisites

To run the bot, create a `.env` file with the following:

- `DISCORD_TOKEN` (required): Your Discord bot token.
- `PORT` (optional): Specify a port if needed.

The bot will not run without the Discord token.

### Installation

1. Install the dependencies:
   ```bash
   npm install
   ```

2. (Optional) Install `pm2` globally for process management:
   ```bash
   sudo npm install -g pm2
   ```

### Running the Bot

You can start the bot using either `pm2` or by directly running the script.

#### Option 1: Running with `pm2` (Recommended)

`pm2` is a process manager that makes it easier to manage your bot, including monitoring memory usage, restarting, and reloading.

1. Start the bot with `pm2`:
   ```bash
   pm2 start index.js --name "XenonDiscord-bot"
   ```
   - The name you assign will appear in `pm2`'s task list.

2. Manage the bot using the following commands:
   - Check status: 
     ```bash
     pm2 status
     ```
   - Reload the bot:
     ```bash
     pm2 reload XenonDiscord-bot
     ```
   - Stop the bot:
     ```bash
     pm2 stop <id>
     ```

#### Option 2: Running Without `pm2`

If you prefer not to use `pm2`, you can run the bot directly:

1. Start the bot:
   ```bash
   nohup node index.js > bot.log 2>&1 &
   ```
   - This command runs the bot in the background and logs output to `bot.log`.

2. To view the log output:
   ```bash
   tail -f bot.log
   ```

3. To find and terminate the process:
   ```bash
   ps aux | grep node
   ```
   - Then, kill the process using:
     ```bash
     kill <process_id>
     ```

### Reporting Issues

If you encounter any issues, please create an issue ticket. We will address it as soon as possible.

## TODO

- Add support for passing the bot token as a command-line argument.
- Include `pm2` as a dependency to streamline installation.
- Develop a `scrim` command to schedule, store, and send reminders for scrims, including direct messaging users involved.
