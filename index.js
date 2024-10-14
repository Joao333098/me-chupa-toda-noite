import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from 'discord.js';
import fs from 'fs';

// Criação do bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Arquivo onde as configurações serão salvas
const CONFIG_FILE = './config.json';

const roleId = '1269491541492371588'; // ID do cargo necessário

// Função para carregar as configurações
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        const configData = fs.readFileSync(CONFIG_FILE);
        return JSON.parse(configData);
    }
    return {
        anuncioChannelId: null,
        pingRoleId: null,
        enviarFoto: true,
        botLigado: false,
        fotoUrl: null,
        pingEnabled: true,
        urlEnabled: true,
        reacoesProibidas: [],
        reacoesSecundarias: [],
        reacoesLigadas: true
    };
}

// Função para salvar as configurações
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Carregar as configurações ao iniciar o bot
let config = loadConfig();

// Quando o bot for iniciado
client.once('ready', () => {
    console.log(`Bot está online como ${client.user.tag}`);
});

// Função para criar botões de configuração
function createConfigButtons() {
    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('configurar')
                    .setLabel('Configurar Canal de Anúncios')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ping')
                    .setLabel('Configurar Ping')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('foto')
                    .setLabel('Configurar URL da Imagem')
                    .setStyle(ButtonStyle.Primary)
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('reacao')
                    .setLabel('Configurar Reações')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('toggle')
                    .setLabel('Ligar/Desligar Bot')
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    console.log(`Mensagem recebida no canal: ${message.channel.id}`); // Para depuração

    // Verificar se o bot está ligado e se a mensagem foi enviada no canal de anúncios configurado
    if (config.botLigado && message.channel.id === config.anuncioChannelId) {
        console.log('Bot está ligado e a mensagem foi enviada no canal de anúncios.'); // Para depuração
        try {
            // Publicar a mensagem do usuário no canal de anúncios
            if (message.channel.type === 5) {
                await message.crosspost();
                console.log('Mensagem do usuário publicada com sucesso!');

                // Enviar mensagem de aviso após publicação
                let avisoContent = config.pingEnabled && config.pingRoleId ? `<@&${config.pingRoleId}> ` : '';
                avisoContent += ' ';

                await message.channel.send({
                    content: avisoContent,
                    embeds: config.urlEnabled && config.fotoUrl ? [{ image: { url: config.fotoUrl } }] : null
                });
            }
        } catch (error) {
            console.error('Erro ao publicar a mensagem do usuário:', error);
        }
    }

      // Verificação do cargo antes de permitir o comando .set
    if (message.content.startsWith('.set')) {
        const member = message.member;
        

        // Verifica se o membro tem o cargo específico
        if (!member.roles.cache.has(roleId)) {
            await message.reply('Você não tem permissão para usar esse comando exclusivo da blox universe lol.');
            return;
        }

        const configButtons = createConfigButtons();
        await message.channel.send({
            content: 'Painel de controle do bot:',
            components: configButtons
        });
    }

    // Adiciona reações apenas no canal de anúncios
    await addReactions(message);
});

// Função para criar o painel de Ping
function createPingPanel() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('togglePing')
                .setLabel(config.pingEnabled ? 'Desligar Ping' : 'Ligar Ping')
                .setStyle(config.pingEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('changePing')
                .setLabel('Trocar ID do Cargo para Ping')
                .setStyle(ButtonStyle.Primary)
        );
}

// Função para criar o painel de URL
function createUrlPanel() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('toggleUrl')
                .setLabel(config.urlEnabled ? 'Desligar URL' : 'Ligar URL')
                .setStyle(config.urlEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('changeUrl')
                .setLabel('Trocar URL da Imagem')
                .setStyle(ButtonStyle.Primary)
        );
}

// Função para criar o painel de Anúncios
function createAnuncioPanel() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('changeAnuncioChannel')
                .setLabel('Trocar Canal de Anúncios')
                .setStyle(ButtonStyle.Primary)
        );
}

// Função para criar o painel de reações
function createReactionsPanel() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('addProhibitedReaction')
                .setLabel('Adicionar Reação Proibida')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('resetProhibitedReactions')
                .setLabel('Resetar Reações Proibidas')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('addSecondaryReaction')
                .setLabel('Adicionar Reação Secundária')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('resetSecondaryReactions')
                .setLabel('Resetar Reações Secundárias')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('toggleReactions')
                .setLabel(config.reacoesLigadas ? 'Desligar Reações' : 'Ligar Reações')
                .setStyle(config.reacoesLigadas ? ButtonStyle.Danger : ButtonStyle.Success)
        );
}

// Função para lidar com a adição de reações
async function addReactions(message) {
    // Verifica se o bot está ligado e se o canal é o de anúncios
    if (!config.reacoesLigadas || !config.botLigado || message.channel.id !== config.anuncioChannelId) return;

    const ignoredEmojis = config.reacoesProibidas;
    const fixedEmojis = config.reacoesSecundarias;

    // Capturar emojis na mensagem
    const customEmojis = message.content.match(/<:\w+:\d+>/g) || [];
    const standardEmojis = message.content.match(/[\p{Emoji_Presentation}]/gu) || [];
    const allEmojis = [...customEmojis, ...standardEmojis];

    // Tentar reagir com o primeiro emoji válido
    for (const emoji of allEmojis) {
        if (!ignoredEmojis.includes(emoji)) {
            try {
                await message.react(emoji);
                break; // Para após a primeira reação válida
            } catch (error) {
                console.error(`Erro ao reagir com emoji ${emoji}:`, error);
            }
        }
    }

    // Adicionar os emojis fixos
    for (const emoji of fixedEmojis) {
        try {
            await message.react(emoji);
        } catch (error) {
            console.error(`Erro ao reagir com emoji fixo ${emoji}:`, error);
        }
    }
}

// Lidar com as interações dos botões
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    

    // Verifica se o membro tem o cargo específico antes de permitir a interação
    if (!interaction.member.roles.cache.has(roleId)) {
        await interaction.reply({ content: 'Você não tem permissão para interagir com este botão.', ephemeral: true });
        return;
    }

    // Painel para Anúncios
    if (interaction.customId === 'configurar') {
        await interaction.reply({
            content: 'Configuração do Canal de Anúncios:',
            components: [createAnuncioPanel()],
            ephemeral: true
        });
        return;
    }

    // Painel para Ping
    if (interaction.customId === 'ping') {
        await interaction.reply({
            content: 'Configuração do Ping:',
            components: [createPingPanel()],
            ephemeral: true
        });
        return;
    }

    // Painel para URL
    if (interaction.customId === 'foto') {
        await interaction.reply({
            content: 'Configuração da URL da Imagem:',
            components: [createUrlPanel()],
            ephemeral: true
        });
        return;
    }

    // Painel para Reações
    if (interaction.customId === 'reacao') {
        await interaction.reply({
            content: 'Configuração de Reações:',
            components: [createReactionsPanel()],
            ephemeral: true
        });
        return;
    }

    // Alternar o estado do Bot
    if (interaction.customId === 'toggle') {
        config.botLigado = !config.botLigado;
        saveConfig(config);
        await interaction.update({
            content: `Bot foi ${config.botLigado ? 'ligado' : 'desligado'}.`,
            components: createConfigButtons()
        });
        return;
    }

    // Lógica para lidar com outros botões de configuração
    // [Continue com o restante da lógica dos botões aqui...]
        // Lógica para lidar com outros botões de configuração
    if (interaction.customId === 'togglePing') {
        config.pingEnabled = !config.pingEnabled;
        saveConfig(config);
        await interaction.update({
            content: `Ping foi ${config.pingEnabled ? 'ligado' : 'desligado'}.`,
            components: [createPingPanel()]
        });
        return;
    }

    if (interaction.customId === 'changePing') {
        // Aqui você deve adicionar lógica para mudar o ID do cargo de ping
        await interaction.reply({ content: 'Envie o novo ID do cargo para ping.', ephemeral: true });
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, max: 1 });

        collector.on('collect', async m => {
            config.pingRoleId = m.content;
            saveConfig(config);
            await interaction.followUp({ content: `ID do cargo para ping atualizado para: ${config.pingRoleId}`, ephemeral: true });
            collector.stop();
        });
        return;
    }

    if (interaction.customId === 'toggleUrl') {
        config.urlEnabled = !config.urlEnabled;
        saveConfig(config);
        await interaction.update({
            content: `URL da imagem foi ${config.urlEnabled ? 'ligada' : 'desligada'}.`,
            components: [createUrlPanel()]
        });
        return;
    }

    if (interaction.customId === 'changeUrl') {
        await interaction.reply({ content: 'Envie a nova URL da imagem.', ephemeral: true });
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, max: 1 });

        collector.on('collect', async m => {
            config.fotoUrl = m.content;
            saveConfig(config);
            await interaction.followUp({ content: `URL da imagem atualizada para: ${config.fotoUrl}`, ephemeral: true });
            collector.stop();
        });
        return;
    }

    if (interaction.customId === 'changeAnuncioChannel') {
        await interaction.reply({ content: 'Envie o ID do novo canal de anúncios.', ephemeral: true });
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, max: 1 });

        collector.on('collect', async m => {
            config.anuncioChannelId = m.content;
            saveConfig(config);
            await interaction.followUp({ content: `Canal de anúncios atualizado para: ${config.anuncioChannelId}`, ephemeral: true });
            collector.stop();
        });
        return;
    }

    if (interaction.customId === 'addProhibitedReaction') {
        await interaction.reply({ content: 'Envie a reação que deseja proibir.', ephemeral: true });
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, max: 1 });

        collector.on('collect', async m => {
            config.reacoesProibidas.push(m.content);
            saveConfig(config);
            await interaction.followUp({ content: `Reação proibida adicionada: ${m.content}`, ephemeral: true });
            collector.stop();
        });
        return;
    }

    if (interaction.customId === 'resetProhibitedReactions') {
        config.reacoesProibidas = [];
        saveConfig(config);
        await interaction.update({
            content: 'Todas as reações proibidas foram removidas.',
            components: [createReactionsPanel()]
        });
        return;
    }

    if (interaction.customId === 'addSecondaryReaction') {
        await interaction.reply({ content: 'Envie a reação secundária que deseja adicionar.', ephemeral: true });
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, max: 1 });

        collector.on('collect', async m => {
            config.reacoesSecundarias.push(m.content);
            saveConfig(config);
            await interaction.followUp({ content: `Reação secundária adicionada: ${m.content}`, ephemeral: true });
            collector.stop();
        });
        return;
    }

    if (interaction.customId === 'resetSecondaryReactions') {
        config.reacoesSecundarias = [];
        saveConfig(config);
        await interaction.update({
            content: 'Todas as reações secundárias foram removidas.',
            components: [createReactionsPanel()]
        });
        return;
    }

    if (interaction.customId === 'toggleReactions') {
        config.reacoesLigadas = !config.reacoesLigadas;
        saveConfig(config);
        await interaction.update({
            content: `Reações foram ${config.reacoesLigadas ? 'ligadas' : 'desligadas'}.`,
            components: [createReactionsPanel()]
        });
        return;
    }
});

// Iniciar o bot
client.login('token'); // Substitua 'YOUR_BOT_TOKEN' pelo seu token real