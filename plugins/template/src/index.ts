import { logger } from "@vendetta";
import Settings from "./Settings";
import GiveawaySection from "./GiveawaySection";
import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName, findByTypeName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";

const MessageActions = findByProps("sendMessage", "editMessage");
const UserStore = findByStoreName("UserStore");
const ChannelStore = findByProps("getChannel");
const HTTP = findByProps("get", "del", "post", "put", "patch");
const { receiveMessage } = findByProps("receiveMessage");
const { createBotMessage } = findByProps("createBotMessage");

const commands: (() => void)[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const sendBotMsg = (chanId: string, content: string) =>
  receiveMessage(
    chanId,
    Object.assign(createBotMessage({ channelId: chanId, content }), {
      author: UserStore.getCurrentUser(),
    })
  );

const sendRealMsg = (chanId: string, content: string) =>
  MessageActions.sendMessage(chanId, { content }, void 0, {
    nonce: Date.now().toString(),
  });

const getVal = (args: any[], name: string) =>
  args.find((a) => a.name === name)?.value;

function randomWord() {
  const words = (storage.words || []).filter(
    (w: any) => typeof w === "string" && w.trim().length
  );
  return words.length
    ? words[Math.floor(Math.random() * words.length)]
    : "### (no spam messages configured)";
}

commands.push(
  registerCommand({
    name: "raid",
    displayName: "raid",
    description: "Start a raid",
    options: [
      { name: "amount", displayName: "amount", description: "Times", required: true, type: 4 },
      { name: "delay", displayName: "delay", description: "Delay (ms)", required: true, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const amount = getVal(args, "amount");
      const delay = getVal(args, "delay");
      for (let i = 0; i < amount; i++) {
        await sleep(delay);
        sendRealMsg(ctx.channel.id, `${randomWord()} \`${Math.floor(Math.random() * 100)}\``);
      }
    },
  }),

  registerCommand({
    name: "fetchprofile",
    displayName: "fetchprofile",
    description: "Fetch avatar",
    options: [{ name: "user", displayName: "user", description: "ID/Mention", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const id = getVal(args, "user")?.replace(/[<@!>]/g, "");
      const user = UserStore.getUser(id);
      if (!user) return sendBotMsg(ctx.channel.id, "❌ User not found");
      const url = user.getAvatarURL?.({ format: "png", size: 512 }) || `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator) % 5}.png`;
      sendBotMsg(ctx.channel.id, url);
    },
  }),

  registerCommand({
    name: "mcs",
    displayName: "mcs",
    description: "Broadcast message",
    options: [
      { name: "message", displayName: "message", description: "Text", required: true, type: 3 },
      { name: "delay", displayName: "delay", description: "Delay (ms)", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const guildId = ctx.channel.guild_id;
      if (!guildId) return;
      const msg = getVal(args, "message");
      const delay = getVal(args, "delay") ?? 500;
      try {
        const { body: channels } = await HTTP.get({ url: `/guilds/${guildId}/channels` });
        let sent = 0;
        for (const ch of channels.filter((c: any) => c.type === 0 || c.type === 5)) {
          await sleep(delay);
          sendRealMsg(ch.id, msg);
          sent++;
        }
        sendBotMsg(ctx.channel.id, `📢 Sent to ${sent} channels.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "purge",
    displayName: "purge",
    description: "Delete messages",
    options: [
      { name: "amount", displayName: "amount", description: "Count", required: false, type: 4 },
      { name: "self", displayName: "self", description: "Self only?", required: true, type: 5 },
      { name: "delay", displayName: "delay", description: "Delay (ms)", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const amount = getVal(args, "amount") ?? 50;
      const self = getVal(args, "self");
      const delay = getVal(args, "delay") ?? 100;
      try {
        const { body: msgs } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages?limit=100` });
        const toDel = (self ? msgs.filter((m: any) => m.author.id === UserStore.getCurrentUser().id) : msgs).slice(0, amount);
        let count = 0;
        for (const m of toDel) {
          await HTTP.del({ url: `/channels/${ctx.channel.id}/messages/${m.id}` });
          count++;
          await sleep(delay);
        }
        sendBotMsg(ctx.channel.id, `🧹 Purged ${count} messages.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "lockdown",
    displayName: "lockdown",
    description: "Toggle privacy",
    options: [
      { name: "enabled", displayName: "enabled", description: "Lock?", required: true, type: 5 },
      { name: "delay", displayName: "delay", description: "Delay", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const guildId = ctx.channel.guild_id;
      if (!guildId) return;
      const enabled = getVal(args, "enabled");
      const delay = getVal(args, "delay") ?? 300;
      if (!storage.lockdownCache) storage.lockdownCache = {};
      try {
        const { body: channels } = await HTTP.get({ url: `/guilds/${guildId}/channels` });
        let count = 0;
        for (const ch of channels.filter((c: any) => c.type === 0 || c.type === 5)) {
          await sleep(delay);
          if (!(ch.id in storage.lockdownCache)) storage.lockdownCache[ch.id] = ch.permission_overwrites ?? [];
          const overwrites = enabled ? [...(ch.permission_overwrites ?? [])] : storage.lockdownCache[ch.id];
          if (enabled) {
            const idx = overwrites.findIndex((o: any) => o.id === guildId);
            const entry = { id: guildId, type: 0, allow: "0", deny: (BigInt(overwrites[idx]?.deny ?? 0) | BigInt(3072)).toString() };
            idx !== -1 ? (overwrites[idx] = entry) : overwrites.push(entry);
          }
          await HTTP.patch({ url: `/channels/${ch.id}`, body: { permission_overwrites: overwrites } });
          count++;
        }
        if (!enabled) storage.lockdownCache = {};
        sendBotMsg(ctx.channel.id, `${enabled ? "🔒" : "🔓"} ${count} channels updated.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "userid",
    displayName: "userid",
    description: "Get ID",
    options: [{ name: "user", displayName: "user", description: "User", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const id = getVal(args, "user")?.replace(/[<@!>]/g, "");
      const user = UserStore.getUser(id);
      sendBotMsg(ctx.channel.id, user ? `ID: ${user.id}` : "❌ User not found");
    },
  }),

  registerCommand({
    name: "msp",
    displayName: "msp",
    description: "Mass ping output",
    options: [{ name: "clear", displayName: "clear", description: "Clear?", required: false, type: 5 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      if (getVal(args, "clear")) {
        storage.eventGiveawayPing = "";
        return sendBotMsg(ctx.channel.id, "✅ Cleared.");
      }
      const list = storage.eventGiveawayPing?.trim();
      if (!list) return sendBotMsg(ctx.channel.id, "⚠️ Empty.");
      sendRealMsg(ctx.channel.id, `Wake up: \n${list.split("\n").join(", ")}`);
    },
  }),

  registerCommand({
    name: "delete-channel",
    displayName: "delete-channel",
    description: "Delete target",
    options: [
      { name: "channel", displayName: "channel", description: "Target", required: true, type: 7 },
      { name: "delay", displayName: "delay", description: "Delay", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const id = getVal(args, "channel");
      const delay = getVal(args, "delay") ?? 0;
      await sleep(delay);
      try {
        await HTTP.del({ url: `/channels/${id}` });
        sendBotMsg(ctx.channel.id, "🗑️ Deleted.");
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "nuke",
    displayName: "nuke",
    description: "Nuke server",
    options: [{ name: "delay", displayName: "delay", description: "Delay", required: false, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const guildId = ctx.channel.guild_id;
      if (!guildId) return;
      const delay = getVal(args, "delay") ?? 400;
      try {
        const { body: channels } = await HTTP.get({ url: `/guilds/${guildId}/channels` });
        let count = 0;
        for (const ch of channels) {
          try {
            await HTTP.del({ url: `/channels/${ch.id}` });
            count++;
            await sleep(delay);
          } catch {}
        }
        await HTTP.post({ url: `/guilds/${guildId}/channels`, body: { name: "nuked-by-bemmo", type: 0 } });
        sendBotMsg(ctx.channel.id, `🗑️ Nuked ${count} channels.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "dupe-channel",
    displayName: "dupe-channel",
    description: "Duplicate",
    options: [
      { name: "channel", displayName: "channel", description: "Target", required: true, type: 7 },
      { name: "amount", displayName: "amount", description: "Count", required: true, type: 4 },
      { name: "delay", displayName: "delay", description: "Delay", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const id = getVal(args, "channel");
      const amount = getVal(args, "amount");
      const delay = getVal(args, "delay") ?? 400;
      const guildId = ctx.channel.guild_id;
      if (!id || !guildId) return;
      const data = await HTTP.get({ url: `/channels/${id}` }).then((r: any) => r.body).catch(() => null);
      if (!data) return sendBotMsg(ctx.channel.id, "❌ Error.");
      let created = 0;
      for (let i = 0; i < amount; i++) {
        await sleep(delay);
        try {
          await HTTP.post({
            url: `/guilds/${guildId}/channels`,
            body: { ...data, permission_overwrites: data.permission_overwrites },
          });
          created++;
        } catch {}
      }
      sendBotMsg(ctx.channel.id, `✅ Duplicated ${created} times.`);
    },
  })
);

const UserProfile = findByTypeName("UserProfile") || findByTypeName("UserProfileContent");
if (UserProfile) {
  after("type", UserProfile, (args, ret) => {
    const sections = ret?.props?.children;
    const userId = args[0]?.userId ?? args[0]?.user?.id;
    if (sections && userId) sections.push(React.createElement(GiveawaySection, { userId }));
  });
}

export default {
  onLoad: () => logger.log("Commands loaded."),
  onUnload: () => {
    commands.forEach((u) => u());
    logger.log("Unloaded.");
  },
  settings: Settings,
};
