import { config } from 'dotenv';
config(); // Cargar las variables del archivo .env

import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';

const BOT_TOKEN = process.env.BOT_TOKEN; // Token desde variables de entorno
const CHANNEL_ID = process.env.CHANNEL_ID; // ID del canal desde variables de entorno
const TICKET_EMOJI = '📩';
const CLOSE_EMOJI = '🔒';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.once('ready', async () => {
  console.log(`Bot iniciado como ${client.user.tag}`);

  // Obtener el canal donde se enviará el mensaje inicial
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel || channel.type !== 0) {
    console.error('El canal no existe o no es un canal de texto.');
    return;
  }

  // Enviar mensaje inicial
  const ticketMessage = await channel.send(
    '¡Bienvenido! Reacciona con 📩 para abrir un ticket de soporte.'
  );
  await ticketMessage.react(TICKET_EMOJI);

  console.log('Mensaje de tickets enviado correctamente.');
});

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (reaction.emoji.name !== TICKET_EMOJI || user.bot) return;

    const { message } = reaction;
    const guild = message.guild;

    // Verificar que el evento ocurre en un servidor
    if (!guild) {
      console.error('La reacción no ocurrió en un servidor.');
      return;
    }

    // Eliminar la reacción del usuario
    if (
      message.id === reaction.message.id &&
      message.channel.id === CHANNEL_ID
    ) {
      await reaction.users.remove(user.id);
    }

    // Verificar si el usuario ya tiene un ticket abierto
    const existingChannel = guild.channels.cache.find(
      (c) => c.name === `ticket-${user.username}` && c.type === 0
    );

    if (existingChannel) {
      user.send(
        '¡Ya tienes un ticket abierto! Por favor, verifica el canal correspondiente.'
      );
      return;
    }

    // Buscar la categoría "Tickets"
    const category = guild.channels.cache.find(
      (c) => c.name === 'Tickets' && c.type === 4
    );
    if (!category) {
      user.send(
        'No se encontró una categoría llamada "Tickets". Contacta a un administrador.'
      );
      return;
    }

    // Crear el canal de ticket
    const ticketChannel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: 0, // Canal de texto
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
      ],
    });

    const closeMessage = await ticketChannel.send(
      `Hola ${user}, ¡gracias por abrir un ticket! Un miembro del equipo te ayudará pronto.\n\n` +
        `Cuando termines, reacciona con 🔒 a este mensaje para cerrar el ticket.`
    );
    await closeMessage.react(CLOSE_EMOJI);

    console.log(
      `Ticket creado para ${user.username} en el canal ${ticketChannel.name}.`
    );
  } catch (error) {
    console.error('Error al manejar la reacción:', error);
  }
});

// Cerrar un ticket mediante reacción
client.on('messageReactionAdd', async (reaction, user) => {
  try {
    if (reaction.emoji.name === CLOSE_EMOJI && !user.bot) {
      const { channel } = reaction.message;

      // Verificar que es un canal de ticket
      if (channel.name.startsWith('ticket-')) {
        await channel.send('Cerrando el ticket en 5 segundos...');
        setTimeout(() => {
          channel.delete().catch(console.error);
        }, 5000);
      }
    }
  } catch (error) {
    console.error('Error al cerrar el ticket:', error);
  }
});
// Iniciar el bot
client.login(BOT_TOKEN);
