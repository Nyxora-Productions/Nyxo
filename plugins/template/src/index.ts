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
const GuildStore = findByStoreName("GuildStore");
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
    name: "gemini",
    displayName: "gemini",
    description: "Ask Gemini AI something",
    options: [{ name: "prompt", displayName: "prompt", description: "Your question", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const prompt = getVal(args, "prompt");
      const apiKey = storage.geminiKey;

      if (!apiKey) return sendBotMsg(ctx.channel.id, "❌ No API Key found. Set it in plugin settings!");

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-preview:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
        sendRealMsg(ctx.channel.id, `**Gemini AI:**\n${responseText}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ API Error: ${e}`);
      }
    },
  }),
  registerCommand({
    name: "math",
    displayName: "math",
    description: "Solve an equation",
    options: [{ name: "expression", displayName: "expression", description: "e.g. 2 + 2", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      try {
        const res = Function(`return ${getVal(args, "expression")}`)();
        sendBotMsg(ctx.channel.id, `🔢 Result: **${res}**`);
      } catch {
        sendBotMsg(ctx.channel.id, "❌ Invalid expression.");
      }
    },
  }),
  registerCommand({
    name: "serverinfo",
    displayName: "serverinfo",
    description: "Get server stats",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const guild = GuildStore.getGuild(ctx.channel.guild_id);
      if (!guild) return sendBotMsg(ctx.channel.id, "❌ Not in a server.");
      sendBotMsg(ctx.channel.id, `🏰 **${guild.name}**\n🆔 ID: \`${guild.id}\`\n👥 Members: ${guild.approximateMemberCount || "Unknown"}`);
    },
  }),
  registerCommand({
    name: "coinflip",
    displayName: "coinflip",
    description: "Heads or Tails",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const result = Math.random() > 0.5 ? "Heads" : "Tails";
      sendRealMsg(ctx.channel.id, `🪙 I flipped a coin and got: **${result}**`);
    },
  }),
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
        sendRealMsg(ctx.channel.id, `${randomWord()} ${Math.floor(Math.random() * 100)}`);
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
