require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    ActivityType,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require("discord.js");
const express = require('express');
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
import fetch from 'node-fetch';

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
        activities: [{
            name: "xenonesports.gg",
            type: ActivityType.Playing
        }, ],
        status: "online",
    });

    const rest = new REST({
        version: "10"
    }).setToken(token);

    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(Routes.applicationCommands(client.user.id), {
            body: [{
                    name: "hello",
                    description: "I will greet you ^^"
                },
                {
                    name: "about",
                    description: "Sends a DM about Xenon Esports"
                },
                {
                    name: "show-rank",
                    description: "Shows your current mmr."
                },
                {
                    name: "time",
                    description: "Replies with the current time"
                },
                {
                    name: "help",
                    description: "Displays a list of available commands"
                },
                {
                    name: "register",
                    description: "Register a new account"
                },
                {
                    name: "login",
                    description: "Login to your account"
                },
                {
                    name: "change-password",
                    description: "Change your account password"
                },
                {
                    name: "create-scrim",
                    description: "Schedule a scrim",
                    options: [{
                        name: "when",
                        type: 3,
                        description: "When is the scrim?",
                        required: true
                    }]
                },
            ],
        });

        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error(error);
    }
});

// Database initialization
function initializeDatabase(serverId) {
    const dbPath = path.join('.servers', `${serverId}.db`);
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error("Error opening database:", err);
    });
    db.run(
        `CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            hashedPassword TEXT
        )`,
        (err) => {
            if (err) console.error("Error creating users table:", err);
        }
    );
    return db;
}

// Command handler
client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        const {
            commandName,
            guildId,
            user
        } = interaction;
        const db = initializeDatabase(guildId);

        // Command handling
        if (commandName === "register" || commandName === "login") {
            const modal = new ModalBuilder()
                .setCustomId(`${commandName}_modal`)
                .setTitle(`Enter Password to ${commandName.charAt(0).toUpperCase() + commandName.slice(1)}`);

            const passwordInput = new TextInputBuilder()
                .setCustomId("password_input")
                .setLabel("Password")
                .setStyle(TextInputStyle.Short)
                .setMinLength(3)
                .setMaxLength(12)
                .setPlaceholder("Enter your password")
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(passwordInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (commandName === "change-password") {
            const modal = new ModalBuilder()
                .setCustomId("change_password_modal")
                .setTitle("Change Your Password");

            const oldPasswordInput = new TextInputBuilder()
                .setCustomId("old_password_input")
                .setLabel("Old Password")
                .setStyle(TextInputStyle.Short)
                .setMinLength(3)
                .setMaxLength(12)
                .setRequired(true);

            const newPasswordInput = new TextInputBuilder()
                .setCustomId("password_input")
                .setLabel("New Password")
                .setStyle(TextInputStyle.Short)
                .setMinLength(3)
                .setMaxLength(12)
                .setRequired(true);

            const actionRowOldPassword = new ActionRowBuilder().addComponents(oldPasswordInput);
            const actionRowNewPassword = new ActionRowBuilder().addComponents(newPasswordInput);
            modal.addComponents(actionRowOldPassword, actionRowNewPassword);

            await interaction.showModal(modal);
        } else if (commandName === "hello") {
            await interaction.reply({
                content: "Hi, Welcome to Xenon Esports! Use the /about command to learn more about us.",
                ephemeral: true
            });
        } else if (commandName === "about") {
            await interaction.user.send("Xenon Esports is an org that started to create a community that shows love and respect to each other. Check out our website for more info here: https://xenonesportsgg.com");
            await interaction.reply({
                content: "I have sent you a DM with information about Xenon Esports.",
                ephemeral: false
            });
        } else if (commandName === "time") {
            const currentTime = new Date();
            const timeString = `<t:${Math.floor(currentTime.getTime() / 1000)}:F>`; // Full timestamp format
            await interaction.reply({
                content: `The current time is ${timeString}`,
                ephemeral: true
            });
        } else if (commandName === "help") {
            const embed = new EmbedBuilder()
                .setTitle("Xenon Esports Bot Commands")
                .setDescription("Here are the available commands:")
                .addFields({
                    name: "/hello",
                    value: "Replies with a greeting message."
                }, {
                    name: "/about",
                    value: "Sends a DM with information about Xenon Esports."
                }, {
                    name: "/time",
                    value: "Replies with the current time."
                }, {
                    name: "/create-scrim",
                    value: "Schedule a scrim by providing the time."
                }, {
                    name: "/help",
                    value: "Displays this help message."
                }, {
                    name: "/change-password",
                    value: "Allows you to change the password for login."
                }, )
                .setFooter({
                    text: "Use the commands by typing / followed by the command name."
                });

            await interaction.reply({
                embeds: [embed],
                ephemeral: false
            });
        } else if (commandName === "create-scrim") {
            const when = interaction.options.getString("when");
            await interaction.reply({
                content: `Scrim scheduled for ${when}`,
                ephemeral: false
            });
        } else if (commandName === "show-rank") {
            const pageUrl = 'https://tracker.gg/rocket-league/profile/epic/sparkycracked/overview';
        
            try {
                // Fetch the raw HTML text from the page
                const response = await fetch(pageUrl);
        
                // Check if the response is okay
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${response.statusText}`);
                }
        
                const textData = await response.text();
        
                // Log the raw HTML (for debugging purposes, you can remove this once confirmed)
                console.log(textData);
        
                // Search for the rank information in the page text
                const rankMatch = textData.match('/Ranked Doubles 2v2.*?rating:\s*(\d+)/i');
        
                if (rankMatch && rankMatch[1]) {
                    const mmr = rankMatch[1];  // Extract the MMR
                    await interaction.reply({ content: `Your current rank: ${mmr}`, ephemeral: false });
                } else {
                    await interaction.reply({ content: "Ranked Doubles 2v2 data not found.", ephemeral: true });
                }
            } catch (error) {
                // Log the error for debugging purposes
                console.error('Error processing data:', error);
        
                // Inform the user of failure
                await interaction.reply({
                    content: 'Failed to retrieve or process rank data. Please try again later or contact an admin.',
                    ephemeral: true
                });
            }
        }
        
        

    } else if (interaction.isModalSubmit()) {
        const {
            guildId,
            user
        } = interaction;
        const db = initializeDatabase(guildId);
        const command = interaction.customId.split("_")[0];
        const password = interaction.fields.getTextInputValue("password_input");
        const newPassword = password;


        if (command === "register") {
            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                db.run("INSERT INTO users (userId, hashedPassword) VALUES (?, ?)", [user.id, hashedPassword], (err) => {
                    if (err) {
                        if (err.code === "SQLITE_CONSTRAINT") {
                            interaction.reply({
                                content: "You already have an account.",
                                ephemeral: true
                            });
                        } else {
                            console.error("Database error during registration:", err);
                            interaction.reply({
                                content: "Error creating account.",
                                ephemeral: true
                            });
                        }
                    } else {
                        interaction.reply({
                            content: "Account registered successfully!",
                            ephemeral: false
                        });
                    }
                });
            } catch (error) {
                console.error("Error hashing password:", error);
                interaction.reply({
                    content: "An error occurred during registration.",
                    ephemeral: true
                });
            }
        } else if (command === "login") {
            db.get("SELECT hashedPassword FROM users WHERE userId = ?", [user.id], async (err, row) => {
                if (err) {
                    console.error("Database error during login:", err);
                    interaction.reply({
                        content: "Error logging in.",
                        ephemeral: true
                    });
                } else if (!row) {
                    interaction.reply({
                        content: "No account found. Please register first.",
                        ephemeral: true
                    });
                } else {
                    const isMatch = await bcrypt.compare(password, row.hashedPassword);
                    if (isMatch) {
                        interaction.reply({
                            content: "Login successful!",
                            ephemeral: false
                        });
                    } else {
                        interaction.reply({
                            content: "Incorrect password.",
                            ephemeral: false
                        });
                    }
                }
            });
        } else if (command === "change") {
            const oldPassword = interaction.fields.getTextInputValue("old_password_input");
            db.get("SELECT hashedPassword FROM users WHERE userId = ?", [user.id], async (err, row) => {
                if (err) {
                    console.error("Database error during password change:", err);
                    interaction.reply({
                        content: "Error accessing the database.",
                        ephemeral: true
                    });
                    return;
                }

                if (!row) {
                    interaction.reply({
                        content: "No account found. Please register first.",
                        ephemeral: true
                    });
                    return;
                }

                // Compare old password
                const isOldPasswordMatch = await bcrypt.compare(oldPassword, row.hashedPassword);
                if (!isOldPasswordMatch) {
                    interaction.reply({
                        content: "Old password is incorrect.",
                        ephemeral: true
                    });
                    return;
                }

                // Hash new password and update
                try {
                    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
                    db.run("UPDATE users SET hashedPassword = ? WHERE userId = ?", [hashedNewPassword, user.id], (err) => {
                        if (err) {
                            console.error("Error updating password:", err);
                            interaction.reply({
                                content: "Error updating password. Please try again.",
                                ephemeral: true
                            });
                        } else {
                            interaction.reply({
                                content: "Password changed successfully!",
                                ephemeral: false
                            });
                        }
                    });
                } catch (error) {
                    console.error("Error hashing new password:", error);
                    interaction.reply({
                        content: "Error processing the new password.",
                        ephemeral: true
                    });
                }
            });
        }
    }
});

client.login(token).catch(console.error);