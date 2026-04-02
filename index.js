// dealer.js - Genshō Black Market Dealer
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

// Use DISCORD_TOKEN from Railway environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const GHOST_PING_CHANNEL_ID = "1488021993948319865";

// Database Setup
const DEALER_DB = './dealer_db.json';
let economyData = { users: {}, families: {}, shop: { items: [], lastRotation: 0, stockMsgId: null, stockChanId: null } };

function loadData() {
    if (fs.existsSync(DEALER_DB)) {
        try {
            const fileContent = fs.readFileSync(DEALER_DB, 'utf8');
            if (fileContent) {
                const parsed = JSON.parse(fileContent);
                economyData = parsed;
                if (!economyData.families) economyData.families = {};
            }
        } catch (e) {
            console.error("⚠️ Error loading database, starting fresh:", e.message);
        }
    }
}
loadData();

function saveData() { 
    try {
        fs.writeFileSync(DEALER_DB, JSON.stringify(economyData, null, 2)); 
    } catch (e) {
        console.error("⚠️ Error saving database:", e.message);
    }
}

function ensureUser(id) {
    if (!economyData.users[id]) {
        economyData.users[id] = { ryo: 0, inventory: [] };
    }
}

// ----- ITEM DATABASE -----
const ITEMS = {
    MYTHICAL: [
        { name: "Shindai Prime Blade", price: 500000, rarity: "Mythical", emoji: "🔴" }, { name: "Riser Akuma Blade", price: 450000, rarity: "Mythical", emoji: "🔴" }, { name: "Shiver Tanto", price: 400000, rarity: "Mythical", emoji: "🔴" }, { name: "Bankai Blade", price: 360000, rarity: "Mythical", emoji: "🔴" }, { name: "Raion Blade", price: 330000, rarity: "Mythical", emoji: "🔴" }
    ],
    LEGENDARY: [
        { name: "Satori Blade", price: 150000, rarity: "Legendary", emoji: "🔸" }, { name: "Bomb Blade", price: 140000, rarity: "Legendary", emoji: "🔸" }, { name: "Bomb Blade SL2", price: 145000, rarity: "Legendary", emoji: "🔸" }, { name: "Heaven Blade", price: 190000, rarity: "Legendary", emoji: "🔸" }, { name: "Heaven Blade SL2", price: 195000, rarity: "Legendary", emoji: "🔸" }, { name: "Nimbus Sword", price: 170000, rarity: "Legendary", emoji: "🔸" }, { name: "Nimbus Sword SL2", price: 175000, rarity: "Legendary", emoji: "🔸" }, { name: "Dual Chi Rods", price: 130000, rarity: "Legendary", emoji: "🔸" }, { name: "Riserdawn", price: 200000, rarity: "Legendary", emoji: "🔸" }
    ],
    EPIC: [
        { name: "Ember Chi Blade", price: 75000, rarity: "Epic", emoji: "🟣" }, { name: "Dunes Chi Blade", price: 70000, rarity: "Epic", emoji: "🟣" }, { name: "Nimbus Chi Blade", price: 65000, rarity: "Epic", emoji: "🟣" }, { name: "Haze Chi Blade", price: 60000, rarity: "Epic", emoji: "🟣" }, { name: "Electro Blade", price: 55000, rarity: "Epic", emoji: "🟣" }, { name: "Shizen Raijin", price: 80000, rarity: "Epic", emoji: "🟣" }, { name: "Shindo Blade", price: 50000, rarity: "Epic", emoji: "🟣" }, { name: "Samurai Tanto", price: 45000, rarity: "Epic", emoji: "🟣" }, { name: "Shark Sword", price: 78000, rarity: "Epic", emoji: "🟣" }, { name: "Demon Scythe", price: 72000, rarity: "Epic", emoji: "🟣" }, { name: "Moon Staff", price: 48000, rarity: "Epic", emoji: "🟣" }, { name: "Sun Staff", price: 48000, rarity: "Epic", emoji: "🟣" }, { name: "Dagai Sword", price: 40000, rarity: "Epic", emoji: "🟣" }
    ],
    RARE: [
        { name: "Grass Tanto", price: 25000, rarity: "Rare", emoji: "🔵" }, { name: "Grass Tanto SL2", price: 28000, rarity: "Rare", emoji: "🔵" }, { name: "Acrobat Style", price: 15000, rarity: "Rare", emoji: "🔵" }, { name: "Acrobat Style SL2", price: 18000, rarity: "Rare", emoji: "🔵" }, { name: "Saberu Tanto", price: 22000, rarity: "Rare", emoji: "🔵" }, { name: "Rykan Blade", price: 20000, rarity: "Rare", emoji: "🔵" }, { name: "Kokotsu Blade", price: 30000, rarity: "Rare", emoji: "🔵" }, { name: "Bubble Flute", price: 12000, rarity: "Rare", emoji: "🔵" }, { name: "Sound Flute", price: 12000, rarity: "Rare", emoji: "🔵" }, { name: "Air Style Fan", price: 24000, rarity: "Rare", emoji: "🔵" }
    ],
    COMMON: [
        { name: "Dagai", price: 8000, rarity: "Common", emoji: "◻️" }, { name: "Needle Tanto", price: 6000, rarity: "Common", emoji: "◻️" }, { name: "Azarashi Kunai", price: 4000, rarity: "Common", emoji: "◻️" }
    ],
    CONSUMABLES: [
        { name: "Gingerbread Man", price: 150000, rarity: "Legendary", emoji: "🍪" }, { name: "Rice Cake", price: 75000, rarity: "Epic", emoji: "🍡" }, { name: "Plate of Curry", price: 25000, rarity: "Rare", emoji: "🍛" }, { name: "Super Serum", price: 150000, rarity: "Legendary", emoji: "🧪" }, { name: "Heroes Water", price: 250000, rarity: "Mythical", emoji: "💧" }, { name: "Chi Stim", price: 25000, rarity: "Rare", emoji: "💉" }, { name: "Health Stim", price: 125000, rarity: "Epic", emoji: "💉" }, { name: "Soldier Pill", price: 75000, rarity: "Epic", emoji: "💊" }, { name: "Stamina Pot", price: 25000, rarity: "Rare", emoji: "🧪" }, { name: "Mixed Potion", price: 35000, rarity: "Rare", emoji: "🧪" }, { name: "Chi Pot", price: 35000, rarity: "Rare", emoji: "🧪" }, { name: "Health Pot", price: 35000, rarity: "Rare", emoji: "🧪" }
    ]
};

const CHANCES = { MYTHICAL: 5, LEGENDARY: 10, EPIC: 20, RARE: 35, COMMON: 65 };
const RARITY_COLORS = { Mythical: 0xff0000, Legendary: 0xffa500, Epic: 0x9400d3, Rare: 0x1e90ff, Common: 0x808080 };

// ----- GAMBLING HELPERS -----
const activeGames = new Set();

function rotateShop() {
    const newStock = [];
    for (let i = 0; i < 4; i++) {
        const roll = Math.random() * 100;
        let selectedCategory = 'COMMON';
        if (roll < CHANCES.MYTHICAL) selectedCategory = 'MYTHICAL';
        else if (roll < CHANCES.LEGENDARY) selectedCategory = 'LEGENDARY';
        else if (roll < CHANCES.EPIC) selectedCategory = 'EPIC';
        else if (roll < CHANCES.RARE) selectedCategory = 'RARE';
        const categoryItems = ITEMS[selectedCategory];
        const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
        if (!newStock.find(x => x.name === randomItem.name)) newStock.push(randomItem);
    }
    for (let i = 0; i < 3; i++) {
        const randomConsumable = ITEMS.CONSUMABLES[Math.floor(Math.random() * ITEMS.CONSUMABLES.length)];
        if (!newStock.find(x => x.name === randomConsumable.name)) newStock.push(randomConsumable);
    }
    economyData.shop.items = newStock;
    economyData.shop.lastRotation = Date.now();
    saveData();
    updateLiveStock();
}

async function updateLiveStock() {
    if (!economyData.shop.stockMsgId || !economyData.shop.stockChanId) return;
    try {
        const channel = await client.channels.fetch(economyData.shop.stockChanId);
        if (!channel) return;
        const message = await channel.messages.fetch(economyData.shop.stockMsgId).catch(() => null);
        if (!message) return;

        const embed = new EmbedBuilder().setTitle("📦 BLACK MARKET MASTER STOCK LIST").setColor(0x000000).setDescription("List of all items and their current availability in the market:");
        for (const [category, items] of Object.entries(ITEMS)) {
            const itemList = items.map(it => {
                const inStock = economyData.shop.items.some(s => s.name === it.name);
                return `${it.emoji} **${it.name}** - ${it.price.toLocaleString()} Ryo | ${inStock ? '✅ **IN STOCK**' : '❌ OUT OF STOCK'}`;
            }).join('\n');
            embed.addFields({ name: category, value: itemList || 'None' });
        }
        embed.setTimestamp().setFooter({ text: "Auto-updates when the shop rotates." });
        await message.edit({ embeds: [embed] });
    } catch (err) { console.error("⚠️ Live stock update error:", err.message); }
}

async function findUser(msg, args) {
    const mention = msg.mentions.users.first();
    if (mention) return mention;
    const id = args[0];
    if (id && /^\d{17,20}$/.test(id)) {
        try { return await client.users.fetch(id); } catch (err) { return null; }
    }
    return null;
}

client.on('guildMemberAdd', async member => {
    try {
        const ghostChannel = await client.channels.fetch(GHOST_PING_CHANNEL_ID);
        if (ghostChannel) {
            const ghostMsg = await ghostChannel.send(`<@${member.id}>`);
            await ghostMsg.delete().catch(() => {});
        }
    } catch (e) { console.error("Ghost ping error:", e.message); }
});

client.on('messageCreate', async msg => {
    if (msg.author.bot || !msg.content.startsWith('!')) return;
    const parts = msg.content.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const id = msg.author.id;
    ensureUser(id);

    if (cmd === 'ryo') {
        const target = await findUser(msg, args) || msg.author;
        ensureUser(target.id);
        const embed = new EmbedBuilder().setTitle("💰 RYO BALANCE").setDescription(`**${target.username}** currently holds:`).addFields({ name: '\u200B', value: `🪙 **${economyData.users[target.id].ryo.toLocaleString()} Ryo**` }).setColor(0xffd700).setThumbnail(target.displayAvatarURL());
        return msg.reply({ embeds: [embed] });
    } else if (cmd === 'baltop') {
        const topUsers = Object.entries(economyData.users)
            .map(([id, data]) => ({ id, ryo: data.ryo }))
            .sort((a, b) => b.ryo - a.ryo)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle("🏆 RYO LEADERBOARD - TOP 10")
            .setColor(0xffd700)
            .setDescription("The wealthiest individuals in the server:");

        let leaderboard = "";
        for (let i = 0; i < topUsers.length; i++) {
            try {
                const user = await client.users.fetch(topUsers[i].id);
                leaderboard += `\`${i + 1}.\` **${user.username}** — ${topUsers[i].ryo.toLocaleString()} Ryo\n`;
            } catch (e) {
                leaderboard += `\`${i + 1}.\` **Unknown User** — ${topUsers[i].ryo.toLocaleString()} Ryo\n`;
            }
        }
        embed.addFields({ name: '\u200B', value: leaderboard || "No data available." });
        return msg.reply({ embeds: [embed] });
    } else if (cmd === 'inv') {
        const inv = economyData.users[id].inventory;
        if (inv.length === 0) return msg.reply("🎒 Your inventory is empty!");
        const embed = new EmbedBuilder().setTitle(`🎒 ${msg.author.username.toUpperCase()}'S INVENTORY`).setColor(0x2b2d31).setDescription(inv.map((item, index) => `\`${index + 1}.\` ${item}`).join('\n')).setFooter({ text: `Total Items: ${inv.length}` });
        return msg.reply({ embeds: [embed] });
    } else if (cmd === 'shop') {
        if (Date.now() - economyData.shop.lastRotation > 6 * 60 * 60 * 1000 || economyData.shop.items.length === 0) rotateShop();
        const embed = new EmbedBuilder().setTitle("🌑 GENSHŌ BLACK MARKET DEALER").setDescription("Welcome to the shadows... The goods here are rare, and the price is high. *Choose wisely.*").setColor(0x000000).addFields({ name: '\u200B', value: '━━━━━━━━━━━━━━━━━━━━━━━━' });
        economyData.shop.items.forEach(item => { 
            embed.addFields({ name: `${item.emoji} ${item.name}`, value: `💰 **${item.price.toLocaleString()} Ryo** | \`${item.rarity}\``, inline: true }); 
        });
        embed.addFields({ name: '\u200B', value: '━━━━━━━━━━━━━━━━━━━━━━━━' }).setFooter({ text: "Shadowy Dealer • Shop rotates every 6 hours." }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('buy_item')
                .setPlaceholder('Select an item to purchase...')
                .addOptions(economyData.shop.items.map((item, index) => ({ 
                    label: item.name, 
                    description: `${item.price.toLocaleString()} Ryo - ${item.rarity}`, 
                    value: index.toString(), 
                    emoji: item.emoji 
                })))
        );
        return msg.reply({ embeds: [embed], components: [row] });
    } else if (cmd === 'bmcmd') {
        const embed = new EmbedBuilder().setTitle("🌑 BLACK MARKET COMMANDS").setColor(0x000000)
            .addFields(
                { name: '💰 Economy', value: "`!shop` - Open the shop\n`!ryo` - Check your balance\n`!baltop` - View richest players\n`!inv` - View your items" },
                { name: '🎰 Gambling', value: "`!bj [bet]` - Blackjack\n`!slots [bet]` - Casino Slots\n`!horse [bet] [1-5]` - Horse Racing\n`!race [bet] [1-5]` - Car Racing\n`!roulette [bet] [space]` - Roulette" },
                { name: '🛡️ Staff', value: "`!addryo @User [amt]` - Add Ryo\n`!removeryo @User [amt]` - Remove Ryo\n`!wipeinv @User` - Clear inventory\n`!rotateshop` - Force new stock\n`!stock` - View all items\n`!familysetup` - Manage family pools" }
            );
        return msg.reply({ embeds: [embed] });
    } else if (cmd === 'familysetup') {
        if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply("❌ Staff only!");
        const embed = new EmbedBuilder()
            .setTitle("🏘️ FAMILY POOL SETUP")
            .setDescription("Configure the family pools and manage access. Choose an action below.")
            .setColor(0x000000)
            .addFields({ name: '📊 Current Stats', value: `Total Families: ${Object.keys(economyData.families).length}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('family_create').setLabel('Create Family').setStyle(ButtonStyle.Success).setEmoji('➕'),
            new ButtonBuilder().setCustomId('family_manage').setLabel('Manage Family').setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
            new ButtonBuilder().setCustomId('family_access').setLabel('Manage Access').setStyle(ButtonStyle.Secondary).setEmoji('👥')
        );
        return msg.reply({ embeds: [embed], components: [row] });
    } else if (['addryo', 'removeryo', 'rotateshop', 'wipeinv', 'stock'].includes(cmd)) {
        if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply("❌ Staff only!");
        if (cmd === 'rotateshop') { rotateShop(); return msg.reply("✅ Shop has been forcefully rotated!"); }
        if (cmd === 'stock') {
            const embed = new EmbedBuilder().setTitle("📦 BLACK MARKET MASTER STOCK LIST").setColor(0x000000).setDescription("Initializing live stock dashboard...");
            const stockMsg = await msg.channel.send({ embeds: [embed] });
            economyData.shop.stockMsgId = stockMsg.id;
            economyData.shop.stockChanId = msg.channel.id;
            saveData();
            updateLiveStock();
            return;
        }
        const target = await findUser(msg, args);
        if (!target) return msg.reply(`❌ Usage: \`!${cmd} @User [amount]\``);
        ensureUser(target.id);
        if (cmd === 'addryo') {
            const amount = parseInt(args[1]);
            if (isNaN(amount)) return msg.reply("❌ Provide a valid amount.");
            economyData.users[target.id].ryo += amount;
            saveData();
            return msg.reply(`✅ Added **${amount.toLocaleString()} Ryo** to **${target.username}**.`);
        } else if (cmd === 'removeryo') {
            const amount = parseInt(args[1]);
            if (isNaN(amount)) return msg.reply("❌ Provide a valid amount.");
            economyData.users[target.id].ryo = Math.max(0, economyData.users[target.id].ryo - amount);
            saveData();
            return msg.reply(`✅ Removed **${amount.toLocaleString()} Ryo** from **${target.username}**.`);
        } else if (cmd === 'wipeinv') {
            economyData.users[target.id].inventory = [];
            saveData();
            return msg.reply(`✅ Wiped inventory for **${target.username}**.`);
        }
    }

    // ----- GAMBLING COMMANDS -----
    if (['bj', 'slots', 'horse', 'race', 'roulette'].includes(cmd)) {
        if (activeGames.has(id)) return msg.reply("❌ You already have an active game!");
        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet < 100) return msg.reply("❌ Minimum bet is **100 Ryo**.");
        if (economyData.users[id].ryo < bet) return msg.reply("❌ You don't have enough Ryo!");

        if (cmd === 'bj') {
            activeGames.add(id);
            economyData.users[id].ryo -= bet;
            saveData();

            const deck = [];
            const suits = ['♠️', '♥️', '♦️', '♣️'];
            const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
            for (const s of suits) for (const v of values) deck.push({ s, v });

            const draw = () => deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
            const getVal = (hand) => {
                let total = 0, aces = 0;
                hand.forEach(c => {
                    if (['J', 'Q', 'K'].includes(c.v)) total += 10;
                    else if (c.v === 'A') { total += 11; aces++; }
                    else total += parseInt(c.v);
                });
                while (total > 21 && aces > 0) { total -= 10; aces--; }
                return total;
            };

            const playerHand = [draw(), draw()];
            const dealerHand = [draw(), draw()];

            const bjEmbed = (done = false) => {
                const embed = new EmbedBuilder().setTitle("🃏 BLACKJACK").setColor(0x000000)
                    .addFields(
                        { name: `Your Hand (${getVal(playerHand)})`, value: playerHand.map(c => `\`${c.v}${c.s}\``).join(' '), inline: true },
                        { name: `Dealer Hand (${done ? getVal(dealerHand) : '?'})`, value: done ? dealerHand.map(c => `\`${c.v}${c.s}\``).join(' ') : `\`${dealerHand[0].v}${dealerHand[0].s}\` \`??\``, inline: true }
                    );
                return embed;
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`bj_hit_${id}_${bet}`).setLabel('Hit').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`bj_stand_${id}_${bet}`).setLabel('Stand').setStyle(ButtonStyle.Secondary)
            );

            const bjMsg = await msg.reply({ embeds: [bjEmbed()], components: [row] });

            if (getVal(playerHand) === 21) {
                activeGames.delete(id);
                economyData.users[id].ryo += Math.floor(bet * 2.5);
                saveData();
                return bjMsg.edit({ embeds: [bjEmbed(true).setDescription("✨ **Blackjack! You win!**")], components: [] });
            }
        } else if (cmd === 'slots') {
            economyData.users[id].ryo -= bet;
            const emojis = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
            const roll = [emojis[Math.floor(Math.random() * emojis.length)], emojis[Math.floor(Math.random() * emojis.length)], emojis[Math.floor(Math.random() * emojis.length)]];
            
            let win = 0;
            if (roll[0] === roll[1] && roll[1] === roll[2]) {
                if (roll[0] === '7️⃣') win = bet * 10;
                else if (roll[0] === '💎') win = bet * 7;
                else win = bet * 5;
            } else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) {
                win = Math.floor(bet * 1.5);
            }

            economyData.users[id].ryo += win;
            saveData();

            const slotEmbed = new EmbedBuilder().setTitle("🎰 CASINO SLOTS").setColor(win > 0 ? 0x00ff00 : 0xff0000)
                .setDescription(`**[ ${roll.join(' | ')} ]**\n\n${win > 0 ? `💰 You won **${win.toLocaleString()} Ryo**!` : "❌ Better luck next time!"}`)
                .setFooter({ text: `Balance: ${economyData.users[id].ryo.toLocaleString()} Ryo` });
            return msg.reply({ embeds: [slotEmbed] });
        } else if (cmd === 'horse' || cmd === 'race') {
            const choice = parseInt(args[1]);
            if (isNaN(choice) || choice < 1 || choice > 5) return msg.reply(`❌ Choose a ${cmd === 'horse' ? 'horse' : 'car'} (1-5)!`);
            
            economyData.users[id].ryo -= bet;
            const winner = Math.floor(Math.random() * 5) + 1;
            const isWin = choice === winner;
            const winAmt = bet * 4;

            if (isWin) economyData.users[id].ryo += winAmt;
            saveData();

            const raceEmbed = new EmbedBuilder().setTitle(cmd === 'horse' ? "🏇 HORSE RACING" : "🏎️ CAR RACING").setColor(isWin ? 0x00ff00 : 0xff0000)
                .setDescription(`The race is on...\n\n🏁 Winner: **#${winner}**\nYour Choice: **#${choice}**\n\n${isWin ? `💰 You won **${winAmt.toLocaleString()} Ryo**!` : "❌ Your choice lost."}`);
            return msg.reply({ embeds: [raceEmbed] });
        } else if (cmd === 'roulette') {
            const space = args[1]?.toLowerCase();
            if (!space) return msg.reply("❌ Choose a space: `red`, `black`, `even`, `odd`, or a number `0-36`.");
            
            economyData.users[id].ryo -= bet;
            const result = Math.floor(Math.random() * 37);
            const red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
            const isRed = red.includes(result);
            
            let isWin = false;
            let multiplier = 2;

            if (space === 'red' && isRed) isWin = true;
            else if (space === 'black' && !isRed && result !== 0) isWin = true;
            else if (space === 'even' && result % 2 === 0 && result !== 0) isWin = true;
            else if (space === 'odd' && result % 2 !== 0) isWin = true;
            else if (parseInt(space) === result) { isWin = true; multiplier = 35; }

            const winAmt = isWin ? bet * multiplier : 0;
            economyData.users[id].ryo += winAmt;
            saveData();

            const color = result === 0 ? '🟢' : (isRed ? '🔴' : '⚫');
            const roulEmbed = new EmbedBuilder().setTitle("🎡 ROULETTE").setColor(isWin ? 0x00ff00 : 0xff0000)
                .setDescription(`The ball landed on: ${color} **${result}**\n\n${isWin ? `💰 You won **${winAmt.toLocaleString()} Ryo**!` : "❌ You lost your bet."}`);
            return msg.reply({ embeds: [roulEmbed] });
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        const id = interaction.user.id;
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('bj_')) {
                const [_, action, originalId, betStr] = interaction.customId.split('_');
                if (id !== originalId) return interaction.reply({ content: "Unauthorized!", ephemeral: true });
                const bet = parseInt(betStr);
                
                // Need to reconstruct game state from embed since we don't have a persistent game object
                const embed = interaction.message.embeds[0];
                const playerHandStr = embed.fields[0].value;
                const dealerHandStr = embed.fields[1].value;
                
                const parseHand = (str) => {
                    const cards = [];
                    const matches = str.match(/`(\d+|[AJQK])(♠️|♥️|♦️|♣️)`/g);
                    if (matches) {
                        matches.forEach(m => {
                            const clean = m.replace(/`/g, '');
                            const s = clean.slice(-2);
                            const v = clean.slice(0, -2);
                            cards.push({ v, s });
                        });
                    }
                    return cards;
                };

                const playerHand = parseHand(playerHandStr);
                const dealerHand = parseHand(dealerHandStr);
                
                const deck = [];
                const suits = ['♠️', '♥️', '♦️', '♣️'];
                const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
                for (const s of suits) for (const v of values) deck.push({ s, v });
                // Filter out cards already in play
                [...playerHand, ...dealerHand].forEach(c => {
                    const idx = deck.findIndex(dc => dc.v === c.v && dc.s === c.s);
                    if (idx !== -1) deck.splice(idx, 1);
                });

                const draw = () => deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
                const getVal = (hand) => {
                    let total = 0, aces = 0;
                    hand.forEach(c => {
                        if (['J', 'Q', 'K'].includes(c.v)) total += 10;
                        else if (c.v === 'A') { total += 11; aces++; }
                        else total += parseInt(c.v);
                    });
                    while (total > 21 && aces > 0) { total -= 10; aces--; }
                    return total;
                };

                const bjEmbedUpdate = (done = false) => {
                    const e = new EmbedBuilder().setTitle("🃏 BLACKJACK").setColor(0x000000)
                        .addFields(
                            { name: `Your Hand (${getVal(playerHand)})`, value: playerHand.map(c => `\`${c.v}${c.s}\``).join(' '), inline: true },
                            { name: `Dealer Hand (${done ? getVal(dealerHand) : '?'})`, value: done ? dealerHand.map(c => `\`${c.v}${c.s}\``).join(' ') : `\`${dealerHand[0].v}${dealerHand[0].s}\` \`??\``, inline: true }
                        );
                    return e;
                };

                if (action === 'hit') {
                    playerHand.push(draw());
                    const val = getVal(playerHand);
                    if (val > 21) {
                        activeGames.delete(id);
                        return interaction.update({ embeds: [bjEmbedUpdate(true).setDescription("💥 **Bust! You lost.**")], components: [] });
                    }
                    return interaction.update({ embeds: [bjEmbedUpdate()] });
                } else if (action === 'stand') {
                    activeGames.delete(id);
                    while (getVal(dealerHand) < 17) dealerHand.push(draw());
                    const pVal = getVal(playerHand);
                    const dVal = getVal(dealerHand);
                    
                    let msg = "";
                    if (dVal > 21 || pVal > dVal) {
                        economyData.users[id].ryo += bet * 2;
                        msg = "🏆 **You win!**";
                    } else if (pVal === dVal) {
                        economyData.users[id].ryo += bet;
                        msg = "🤝 **Push. Bet returned.**";
                    } else {
                        msg = "❌ **Dealer wins.**";
                    }
                    saveData();
                    return interaction.update({ embeds: [bjEmbedUpdate(true).setDescription(msg)], components: [] });
                }
            }

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: "❌ Staff only!", ephemeral: true });
            if (interaction.customId === 'family_create') {
                await interaction.reply({ content: "Type the name of the new family to create:", ephemeral: true });
                const filter = m => m.author.id === interaction.user.id;
                const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
                collector.on('collect', m => {
                    const name = m.content.trim();
                    if (economyData.families[name]) return m.reply("❌ That family already exists!");
                    economyData.families[name] = { ryo: 0, items: [], members: [] };
                    saveData();
                    m.reply(`✅ Created family: **${name}**!`);
                });
            } else if (interaction.customId === 'family_manage') {
                const families = Object.keys(economyData.families);
                if (families.length === 0) return interaction.reply({ content: "No families setup yet!", ephemeral: true });
                const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('family_select_manage').setPlaceholder('Choose a family').addOptions(families.map(f => ({ label: f, value: f }))));
                await interaction.update({ content: "Select a family to view stats:", components: [row], embeds: [] });
            } else if (interaction.customId === 'family_access') {
                const families = Object.keys(economyData.families);
                if (families.length === 0) return interaction.reply({ content: "No families setup yet!", ephemeral: true });
                const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('family_select_access').setPlaceholder('Choose a family').addOptions(families.map(f => ({ label: f, value: f }))));
                await interaction.update({ content: "Select a family to manage access:", components: [row], embeds: [] });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'buy_item') {
                ensureUser(id);
                const itemIndex = parseInt(interaction.values[0]);
                const item = economyData.shop.items[itemIndex];
                if (!item) return interaction.reply({ content: "❌ That item is no longer in stock!", ephemeral: true });
                if (economyData.users[id].ryo < item.price) return interaction.reply({ content: `❌ You don't have enough Ryo! (Need ${item.price.toLocaleString()})`, ephemeral: true });
                economyData.users[id].ryo -= item.price;
                economyData.users[id].inventory.push(item.name);
                saveData();
                const buyEmbed = new EmbedBuilder().setTitle("🤝 DEAL COMPLETE").setDescription(`You purchased **${item.name}** for **${item.price.toLocaleString()} Ryo**.`).addFields({ name: 'Remaining Balance', value: `🪙 **${economyData.users[id].ryo.toLocaleString()} Ryo**` }).setColor(RARITY_COLORS[item.rarity] || 0x00ff00).setFooter({ text: "The Dealer nods in approval." });
                await interaction.reply({ embeds: [buyEmbed], ephemeral: true });
            } else if (interaction.customId === 'family_select_manage') {
                const familyName = interaction.values[0];
                const family = economyData.families[familyName];
                const embed = new EmbedBuilder()
                    .setTitle(`⚙️ MANAGE FAMILY: ${familyName.toUpperCase()}`)
                    .setColor(0x000000)
                    .addFields(
                        { name: '💰 Ryo Pool', value: `${family.ryo.toLocaleString()} Ryo` },
                        { name: '🎒 Item Pool', value: `${family.items.length} Items` },
                        { name: '👥 Members', value: `${family.members.length} Members` }
                    );
                await interaction.update({ embeds: [embed], components: [] });
            } else if (interaction.customId === 'family_select_access') {
                const familyName = interaction.values[0];
                await interaction.update({ content: `Managing access for **${familyName}**. Please mention the user to add/remove from the family access:`, components: [], embeds: [] });
                const filter = m => m.author.id === interaction.user.id;
                const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
                collector.on('collect', m => {
                    const target = m.mentions.users.first();
                    if (!target) return m.reply("❌ You must mention a user!");
                    const family = economyData.families[familyName];
                    if (family.members.includes(target.id)) {
                        family.members = family.members.filter(id => id !== target.id);
                        m.reply(`✅ Removed <@${target.id}> from **${familyName}** access.`);
                    } else {
                        family.members.push(target.id);
                        m.reply(`✅ Added <@${target.id}> to **${familyName}** access.`);
                    }
                    saveData();
                });
            }
        }
    } catch (err) { console.error("⚠️ Dealer interaction error:", err.message); }
});

client.once(Events.ClientReady, () => { 
    console.log(`✅ Dealer Bot is ONLINE as ${client.user.tag}`); 
    updateLiveStock(); 
});

if (!TOKEN) {
    console.error("❌ ERROR: DISCORD_TOKEN is missing!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ ERROR: Login failed!");
    console.error(err.message);
});
