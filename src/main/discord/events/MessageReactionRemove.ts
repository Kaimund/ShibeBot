/*
    MessageReactionRemove
    Handles when a text message loses a reaction.
    Copyright (C) 2023 Kaimund
*/ 

import Discord from 'discord.js';
import AppLog from '../../lib/AppLog';
import { getGuildConfig } from '../../lib/GuildDirectory';

export default async function messageReactionRemove (reaction: Discord.MessageReaction) {

    const message = reaction.message;

    // Import the Appropriate Guild Configuration
    const guildConfig = await getGuildConfig(message.guild.id).catch((err) => {
        AppLog.error(new Error(`Failed to get guild configuration for ${message.guild.name}\nReason: ${err}`), 'Message Handling - New Message');
    });
    if (!guildConfig) return;
    if (!guildConfig.starboardModuleEnabled) return;

    const starChannel = message.guild.channels.cache.find(channel => channel.name === 'starboard') as Discord.TextChannel;
    
    if (!starChannel) return; // If the server doesn't have a starboard, return
    if (reaction.emoji.name !== '⭐') return; // If it's not a star, do nothing more
    if (starChannel.type !== Discord.ChannelType.GuildText) return; // Don't try to star a non-text channel
    if (message.channel === starChannel) return; // Don't re-star what's already in the Starboard

    function starboardSearch(msg: Discord.Message): boolean {
        if (!msg.embeds) return false;
        if (!msg.embeds[0].footer) return false;
        return msg.embeds[0].footer.text.startsWith('⭐') && msg.embeds[0].footer.text.endsWith(message.id);
    }

    const stars = starChannel.messages.cache.find(m => starboardSearch(m)); 
    
    if (stars) {

        const star = /^\⭐\s([0-9]{1,3})\s\•\sID:\s([0-9]{17,20})/.exec(stars.embeds[0].footer.text);
        const foundStar = stars.embeds[0];
        const image = message.attachments.size > 0 ? message.attachments.first().url : ''; 
        const embed = new Discord.EmbedBuilder()
          .setColor(foundStar.color)
          .setAuthor({name: message.author.tag, iconURL: message.author.displayAvatarURL()})
          .setTimestamp(message.createdAt)
          .setFooter({text: `⭐ ${parseInt(star[1])-1} • ID: ${message.id}`})
          .setImage(image);
        
        if (foundStar.description) embed.setDescription(foundStar.description);
        const starMsg = starChannel.messages.cache.find(m => m.id === stars.id);
        if (parseInt(star[1]) - 1 < 10) starMsg.delete().catch(() => {}); // If the number of stars falls below the threshold, remove the post from the board.
        else starMsg.edit({embeds: [embed] }).catch(() => {}); 
        return;

    }
}