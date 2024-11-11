require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    ActivityType,
    EmbedBuilder,
} = require("discord.js");
const express = require('express');
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error("Discord token not found in environment variables.");
    process.exit(1);
} else {
    console.log("Token found:", token.slice(0, 5) + "..." + token.slice(-5));
}

// Set up Express server
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
        activities: [
            { name: "xenonesports.gg", type: ActivityType.Playing },
        ],
        status: "online",
    });

    const rest = new REST({ version: "10" }).setToken(token);

    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(Routes.applicationCommands(client.user.id), {
            body: [
                { name: "hello", description: "I will greet you ^^" },
                { name: "about", description: "Sends a DM about Xenon Esports" },
                { name: "time", description: "Replies with the current time" },
                { name: "help", description: "Displays a list of available commands" },
                { name: "create-scrim", description: "Schedule a scrim", options: [{ name: "when", type: 3, description: "When is the scrim?", required: true }] },
                { name: "register", description: "Register a new account", options: [{ name: "password", type: 3, description: "Your password", required: true }] },
                { name: "login", description: "Login to your account", options: [{ name: "password", type: 3, description: "Your password", required: true }] },
            ],
        });

        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error(error);
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    handleCommand(interaction);
});

// Initialize new database
function initializeDatabase(serverId) {
    const db = new sqlite3.Database(`.servers/${serverId}.db`);
    db.serialize(() => {
        db.run(
            `CREATE TABLE IF NOT EXISTS users (
                userId TEXT PRIMARY KEY,
                hashedPassword TEXT
            )`
        );
    });
    return db;
}


// Function to handle commands
async function handleCommand(interaction) {
    const { commandName, guildId, user } = interaction;

    const db = initializeDatabase(guildId);

    if (commandName === "register") {
        const password = interaction.options.getString("password");
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        db.run(
            "INSERT INTO users (userId, hashedPassword) VALUES (?, ?)",
            [user.id, hashedPassword],
            (err) => {
                if (err) {
                    if (err.code === "SQLITE_CONSTRAINT") {
                        interaction.reply("You already have an account.");
                    } else {
                        console.error(err);
                        interaction.reply("Error creating account.");
                    }
                } else {
                    interaction.reply("Account registered successfully!");
                }
            }
        );
    } else if (commandName === "login") {
        const password = interaction.options.getString("password");

        db.get(
            "SELECT hashedPassword FROM users WHERE userId = ?",
            [user.id],
            async (err, row) => {
                if (err) {
                    console.error(err);
                    interaction.reply("Error logging in.");
                } else if (!row) {
                    interaction.reply("No account found. Please register first.");
                } else {
                    const isMatch = await bcrypt.compare(password, row.hashedPassword);
                    if (isMatch) {
                        interaction.reply("Login successful!");
                    } else {
                        interaction.reply("Incorrect password.");
                    }
                }
            }
        );

    } else if (commandName === "hello") {

        await interaction.reply(
            "Hi, Welcome to Xenon Esports! Use the /about command to learn more about us.",
        );
    } else if (commandName === "about") {
        await interaction.user.send(
            "Xenon Esports is an org that started to create a community that shows love and respect to each other. Check out our website for more info here: https://xenonesportsgg.com",
        );
        await interaction.reply(
            "I have sent you a DM with information about Xenon Esports.",
        );
    } else if (commandName === "time") {
        const currentTime = new Date();
        const timeString = `<t:${Math.floor(currentTime.getTime() / 1000)}:F>`; // Full timestamp format
        await interaction.reply(`The current time is ${timeString}`);
    } else if (commandName === "help") {
        const embed = new EmbedBuilder()
            .setTitle("Xenon Esports Bot Commands")
            .setDescription("Here are the available commands:")
            .addFields(
                { name: "/hello", value: "Replies with a greeting message." },
                {
                    name: "/about",
                    value: "Sends a DM with information about Xenon Esports.",
                },
                { name: "/time", value: "Replies with the current time." },
                {
                    name: "/create-scrim",
                    value: "Schedule a scrim by providing the time.",
                },
                { name: "/help", value: "Displays this help message." },
            )
            .setFooter({
                text: "Use the commands by typing / followed by the command name.",
            });

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === "create-scrim") {
        const when = interaction.options.getString("when");
        await interaction.reply(`Scrim scheduled for ${when}`);
    }
}

client.login(token).catch(console.error);
