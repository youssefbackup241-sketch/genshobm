// dealer.js - Genshō Black Market Dealer
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, Events, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
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
let economyData = { users: {}, shop: { items: [], lastRotation: 0, stockMsgId: null, stockChanId: null } };

function loadData() {
    if (fs.existsSync(DEALER_DB)) {
        try {
            const fileContent = fs.readFileSync(DEALER_DB, 'utf8');
            if (fileContent) economyData = JSON.parse(fileContent);
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
        { name: "Shindai Prime Blade", price: 500000, rarity: "Mythical", emoji: "🔴" }, { name: "Riser Akuma Blade", price: 450000, rarity: "Mythical", emoji: "🔴" }, { name: "Shiver Tanto", price: 400000, rarity: "Mythical", emoji: "🔴" }, { name: "Senko Kunai", price: 350000, rarity: "Mythical", emoji: "🔴" }, { name: "SL2 Senko Kunai", price: 350000, rarity: "Mythical", emoji: "🔴" }, { name: "Azim Dual Senko", price: 420000, rarity: "Mythical", emoji: "🔴" }, { name: "Dio Senko Blade", price: 480000, rarity: "Mythical", emoji: "🔴" }
    ],
    LEGENDARY: [
        { name: "Bankai Blade", price: 180000, rarity: "Legendary", emoji: "🔸" }, { name: "Raion Blade", price: 160000, rarity: "Legendary", emoji: "🔸" }, { name: "Satori Blade", price: 150000, rarity: "Legendary", emoji: "🔸" }, { name: "Bomb Blade", price: 140000, rarity: "Legendary", emoji: "🔸" }, { name: "Bomb Blade SL2", price: 145000, rarity: "Legendary", emoji: "🔸" }, { name: "Heaven Blade", price: 190000, rarity: "Legendary", emoji: "🔸" }, { name: "Heaven Blade SL2", price: 195000, rarity: "Legendary", emoji: "🔸" }, { name: "Nimbus Sword", price: 170000, rarity: "Legendary", emoji: "🔸" }, { name: "Nimbus Sword SL2", price: 175000, rarity: "Legendary", emoji: "🔸" }, { name: "Dual Chi Rods", price: 130000, rarity: "Legendary", emoji: "🔸" }, { name: "Riserdawn", price: 200000, rarity: "Legendary", emoji: "🔸" }
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
    const cmd = parts[0];
    const args = parts.slice(1);
    const id = msg.author.id;
    ensureUser(id);

    if (cmd === 'ryo') {
        const target = await findUser(msg, args) || msg.author;
        ensureUser(target.id);
        const embed = new EmbedBuilder().setTitle("💰 RYO BALANCE").setDescription(`**${target.username}** currently holds:`).addFields({ name: '\u200B', value: `🪙 **${economyData.users[target.id].ryo.toLocaleString()} Ryo**` }).setColor(0xffd700).setThumbnail(target.displayAvatarURL());
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
                { name: '💰 Economy', value: "`!shop` - Open the shop\n`!ryo` - Check your balance\n`!inv` - View your items" },
                { name: '🛡️ Staff', value: "`!addryo @User [amt]` - Add Ryo\n`!removeryo @User [amt]` - Remove Ryo\n`!wipeinv @User` - Clear inventory\n`!rotateshop` - Force new stock\n`!stock` - View all items" }
            );
        return msg.reply({ embeds: [embed] });
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
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'buy_item') return;
        const id = interaction.user.id;
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
    } catch (err) { console.error("⚠️ Dealer interaction error:", err.message); }
});

client.once('ready', () => { 
    console.log(`✅ Dealer Bot is ONLINE as ${client.user.tag}`); 
    updateLiveStock(); // Refresh stock on startup
});

if (!TOKEN) {
    console.error("❌ ERROR: DISCORD_TOKEN is missing in Railway environment variables!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ ERROR: Login failed. Check your token and Intents!");
    console.error(err.message);
});
