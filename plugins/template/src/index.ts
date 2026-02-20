import { logger } from "@vendetta";
import Settings from "./Settings";
import GiveawaySection from "./GiveawaySection";
import { registerCommand } from "@vendetta/commands";
import { findByProps, findByStoreName, findByTypeName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";

const MessageActions = findByProps("sendMessage", "editMessage");
const UserStore = findByStoreName("UserStore");
const GuildStore = findByStoreName("GuildStore");
const ChannelStore = findByProps("getChannel");
const HTTP = findByProps("get", "del", "post", "put", "patch");
const { receiveMessage } = findByProps("receiveMessage");
const { createBotMessage } = findByProps("createBotMessage");
const PresenceStore = findByStoreName("PresenceStore");
const RelationshipStore = findByStoreName("RelationshipStore");
const GuildMemberStore = findByStoreName("GuildMemberStore");
const VoiceStateStore = findByStoreName("VoiceStateStore");
const InviteActions = findByProps("createInvite");
const StatusActions = findByProps("setStatus", "setCustomStatus") || {};
const MessageStore = findByStoreName("MessageStore");
const Dispatcher = findByProps("dispatch", "subscribe");

const commands: (() => void)[] = [];
const patches: (() => void)[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const deletedMessages: Map<string, { content: string; author: string; timestamp: number }> = new Map();
const editedMessages: Map<string, { before: string; after: string; author: string; timestamp: number }> = new Map();

const pluginStartTime = Date.now();

if (!storage.notes) storage.notes = [];
if (!storage.tags) storage.tags = {};
if (!storage.macros) storage.macros = {};
if (!storage.aliases) storage.aliases = {};
if (!storage.todos) storage.todos = [];
if (!storage.savedQuotes) storage.savedQuotes = [];
if (!storage.afkReason) storage.afkReason = null;
if (!storage.afkEnabled) storage.afkEnabled = false;
if (!storage.autoReplyEnabled) storage.autoReplyEnabled = false;
if (!storage.autoReplyMsg) storage.autoReplyMsg = "";
if (!storage.keywordAlerts) storage.keywordAlerts = [];
if (!storage.deletedLoggerEnabled) storage.deletedLoggerEnabled = false;
if (!storage.editLoggerEnabled) storage.editLoggerEnabled = false;
if (!storage.deletedLogChannel) storage.deletedLogChannel = null;
if (!storage.editLogChannel) storage.editLogChannel = null;
if (!storage.blocklist) storage.blocklist = [];

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

function toMock(text: string): string {
  return text.split("").map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join("");
}

function toZalgo(text: string): string {
  const combining = ["\u0300","\u0301","\u0302","\u0303","\u0308","\u0307","\u030A","\u0306","\u0335","\u0336","\u0337","\u0338","\u033F","\u0320","\u0321","\u0322","\u0323","\u0324","\u0325","\u0326"];
  return text.split("").map(c => {
    if (c === " ") return c;
    let r = c;
    const count = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < count; i++) r += combining[Math.floor(Math.random() * combining.length)];
    return r;
  }).join("");
}

function toFancy(text: string): string {
  const map: Record<string, string> = {a:"𝓪",b:"𝓫",c:"𝓬",d:"𝓭",e:"𝓮",f:"𝓯",g:"𝓰",h:"𝓱",i:"𝓲",j:"𝓳",k:"𝓴",l:"𝓵",m:"𝓶",n:"𝓷",o:"𝓸",p:"𝓹",q:"𝓺",r:"𝓻",s:"𝓼",t:"𝓽",u:"𝓾",v:"𝓿",w:"𝔀",x:"𝔁",y:"𝔂",z:"𝔃",A:"𝓐",B:"𝓑",C:"𝓒",D:"𝓓",E:"𝓔",F:"𝓕",G:"𝓖",H:"𝓗",I:"𝓘",J:"𝓙",K:"𝓚",L:"𝓛",M:"𝓜",N:"𝓝",O:"𝓞",P:"𝓟",Q:"𝓠",R:"𝓡",S:"𝓢",T:"𝓣",U:"𝓤",V:"𝓥",W:"𝓦",X:"𝓧",Y:"𝓨",Z:"𝓩"};
  return text.split("").map(c => map[c] || c).join("");
}

function toL33t(text: string): string {
  const map: Record<string, string> = {a:"4",e:"3",i:"1",o:"0",s:"5",t:"7",g:"9",b:"8"};
  return text.split("").map(c => map[c.toLowerCase()] || c).join("");
}

function toRegional(text: string): string {
  return text.split("").map(c => {
    const code = c.toLowerCase().charCodeAt(0);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1F1E6 + (code - 97)) + " ";
    if (c === " ") return "  ";
    return c;
  }).join("");
}

function toTiny(text: string): string {
  const map: Record<string, string> = {a:"ᵃ",b:"ᵇ",c:"ᶜ",d:"ᵈ",e:"ᵉ",f:"ᶠ",g:"ᵍ",h:"ʰ",i:"ⁱ",j:"ʲ",k:"ᵏ",l:"ˡ",m:"ᵐ",n:"ⁿ",o:"ᵒ",p:"ᵖ",q:"ᵠ",r:"ʳ",s:"ˢ",t:"ᵗ",u:"ᵘ",v:"ᵛ",w:"ʷ",x:"ˣ",y:"ʸ",z:"ᶻ"};
  return text.toLowerCase().split("").map(c => map[c] || c).join("");
}

function toVapor(text: string): string {
  return text.split("").join(" ");
}

function toBinary(text: string): string {
  return text.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
}

function toHex(text: string): string {
  return text.split("").map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
}

function toBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

function fromBase64(text: string): string {
  return decodeURIComponent(escape(atob(text)));
}

function toHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function genPassword(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function toAsciiArt(text: string): string {
  const lines = ["", "", "", "", ""];
  const letters: Record<string, string[]> = {
    A:["███","█ █","███","█ █","█ █"],B:["██ ","█ █","██ ","█ █","██ "],
    C:["███","█  ","█  ","█  ","███"],D:["██ ","█ █","█ █","█ █","██ "],
    E:["███","█  ","███","█  ","███"],F:["███","█  ","███","█  ","█  "],
    G:["███","█  ","█ █","█ █","███"],H:["█ █","█ █","███","█ █","█ █"],
    I:["███"," █ "," █ "," █ ","███"],J:[" ██","  █","  █","█ █","███"],
    K:["█ █","██ ","█  ","██ ","█ █"],L:["█  ","█  ","█  ","█  ","███"],
    M:["█ █","███","███","█ █","█ █"],N:["█ █","██ █","█ █","█  █","█ █"],
    O:["███","█ █","█ █","█ █","███"],P:["███","█ █","███","█  ","█  "],
    Q:["███","█ █","█ █","██ ","███"],R:["███","█ █","███","██ ","█ █"],
    S:["███","█  ","███","  █","███"],T:["███"," █ "," █ "," █ "," █ "],
    U:["█ █","█ █","█ █","█ █","███"],V:["█ █","█ █","█ █","█ █"," █ "],
    W:["█ █","█ █","███","███","█ █"],X:["█ █"," █ "," █ "," █ ","█ █"],
    Y:["█ █","█ █"," █ "," █ "," █ "],Z:["███","  █"," █ ","█  ","███"],
    " ":["   ","   ","   ","   ","   "]
  };
  for (const ch of text.toUpperCase()) {
    const l = letters[ch] || letters[" "];
    for (let i = 0; i < 5; i++) lines[i] += (l[i] || "   ") + " ";
  }
  return "```\n" + lines.join("\n") + "\n```";
}

const eightBallResponses = ["It is certain.","It is decidedly so.","Without a doubt.","Yes, definitely.","You may rely on it.","As I see it, yes.","Most likely.","Outlook good.","Yes.","Signs point to yes.","Reply hazy, try again.","Ask again later.","Better not tell you now.","Cannot predict now.","Concentrate and ask again.","Don't count on it.","My reply is no.","My sources say no.","Outlook not so good.","Very doubtful."];

const dispatchDeletedLogger = (data: any) => {
  if (!storage.deletedLoggerEnabled) return;
  const chanId = data.channelId || data.channel_id;
  const msgId = data.id || data.message?.id;
  const cached = deletedMessages.get(msgId) || { content: data.message?.content || "[unknown]", author: data.message?.author?.username || "Unknown", timestamp: Date.now() };
  const logChan = storage.deletedLogChannel || chanId;
  sendBotMsg(logChan, `🗑️ **Deleted Message** in <#${chanId}>\n👤 **${cached.author}**\n📝 ${cached.content}`);
};

const dispatchEditLogger = (data: any) => {
  if (!storage.editLoggerEnabled) return;
  const chanId = data.message?.channel_id || data.channelId;
  const msgId = data.message?.id;
  const prev = editedMessages.get(msgId);
  const logChan = storage.editLogChannel || chanId;
  sendBotMsg(logChan, `✏️ **Edited Message** in <#${chanId}>\n👤 **${data.message?.author?.username || "Unknown"}**\n📝 Before: ${prev?.before || "[unknown]"}\n📝 After: ${data.message?.content || "[unknown]"}`);
  if (msgId) editedMessages.set(msgId, { before: data.message?.content || "", after: "", author: data.message?.author?.username || "", timestamp: Date.now() });
};

const onMessageCreate = (data: any) => {
  const msg = data.message;
  if (!msg) return;
  if (msg.id) deletedMessages.set(msg.id, { content: msg.content, author: msg.author?.username || "Unknown", timestamp: Date.now() });
  if (msg.id) editedMessages.set(msg.id, { before: msg.content, after: "", author: msg.author?.username || "", timestamp: Date.now() });

  const me = UserStore.getCurrentUser();
  if (storage.afkEnabled && msg.mentions?.some((u: any) => u.id === me.id)) {
    sendRealMsg(msg.channel_id, `💤 I'm AFK: ${storage.afkReason || "Away"}`);
  }
  if (storage.autoReplyEnabled && msg.author?.id !== me.id && msg.channel_id === storage.autoReplyChannel) {
    sendRealMsg(msg.channel_id, storage.autoReplyMsg || "Auto-reply.");
  }
  if (storage.keywordAlerts?.length && msg.author?.id !== me.id) {
    for (const kw of storage.keywordAlerts) {
      if (msg.content?.toLowerCase().includes(kw.toLowerCase())) {
        sendBotMsg(msg.channel_id, `🔔 **Keyword Alert:** \`${kw}\` detected in <#${msg.channel_id}>\n> ${msg.content}`);
      }
    }
  }
};

const onMessageUpdate = (data: any) => {
  const msg = data.message;
  if (!msg?.id) return;
  const prev = editedMessages.get(msg.id);
  if (prev && msg.content !== prev.before) {
    editedMessages.set(msg.id, { before: prev.before, after: msg.content, author: msg.author?.username || "", timestamp: Date.now() });
    dispatchEditLogger(data);
  }
};

const onMessageDelete = (data: any) => {
  dispatchDeletedLogger(data);
};

if (Dispatcher) {
  Dispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
  Dispatcher.subscribe("MESSAGE_UPDATE", onMessageUpdate);
  Dispatcher.subscribe("MESSAGE_DELETE", onMessageDelete);
}

let stopwatchStart: number | null = null;
let countdownInterval: any = null;

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
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
      sendBotMsg(ctx.channel.id, `🏰 **${guild.name}**\n🆔 ID: \`${guild.id}\`\n👑 Owner: <@${guild.ownerId}>\n🌍 Region: ${guild.preferredLocale}\n💎 Boost Level: ${guild.premiumTier}\n📅 Created: ${new Date(Number((BigInt(guild.id) >> 22n) + 1420070400000n)).toDateString()}`);
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
      const result = Math.random() > 0.5 ? "Heads 🦅" : "Tails 🔵";
      sendRealMsg(ctx.channel.id, `🪙 **${result}**`);
    },
  }),

  registerCommand({
    name: "raid",
    displayName: "raid",
    description: "Spam messages rapidly",
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
    description: "Fetch a user's avatar URL",
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
    description: "Delete messages in a channel",
    options: [
      { name: "amount", displayName: "amount", description: "Count (default 50)", required: false, type: 4 },
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
        sendBotMsg(ctx.channel.id, `🧹 Purged **${count}** messages.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "afk",
    displayName: "afk",
    description: "Toggle AFK mode with auto-reply to mentions",
    options: [
      { name: "reason", displayName: "reason", description: "AFK reason", required: false, type: 3 },
      { name: "toggle", displayName: "toggle", description: "on/off", required: false, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const reason = getVal(args, "reason") || "Away";
      const toggle = getVal(args, "toggle");
      if (toggle === "off" || (storage.afkEnabled && !toggle)) {
        storage.afkEnabled = false;
        storage.afkReason = null;
        sendBotMsg(ctx.channel.id, "✅ AFK mode **disabled**.");
      } else {
        storage.afkEnabled = true;
        storage.afkReason = reason;
        sendBotMsg(ctx.channel.id, `💤 AFK mode **enabled**: ${reason}`);
      }
    },
  }),

  registerCommand({
    name: "autoreply",
    displayName: "autoreply",
    description: "Auto-reply to messages in this channel",
    options: [
      { name: "message", displayName: "message", description: "Reply message (empty = disable)", required: false, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const msg = getVal(args, "message");
      if (!msg) {
        storage.autoReplyEnabled = false;
        storage.autoReplyChannel = null;
        sendBotMsg(ctx.channel.id, "❌ Auto-reply **disabled**.");
      } else {
        storage.autoReplyEnabled = true;
        storage.autoReplyMsg = msg;
        storage.autoReplyChannel = ctx.channel.id;
        sendBotMsg(ctx.channel.id, `✅ Auto-reply **enabled**: ${msg}`);
      }
    },
  }),

  registerCommand({
    name: "snipe",
    displayName: "snipe",
    description: "Show the last deleted message in this channel",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const entries = Array.from(deletedMessages.entries()).filter(([, v]) => v.timestamp > 0);
      if (!entries.length) return sendBotMsg(ctx.channel.id, "❌ Nothing to snipe.");
      const [, last] = entries[entries.length - 1];
      sendBotMsg(ctx.channel.id, `🎯 **Sniped Message**\n👤 **${last.author}**\n📝 ${last.content}\n🕐 ${new Date(last.timestamp).toLocaleTimeString()}`);
    },
  }),

  registerCommand({
    name: "editsnipe",
    displayName: "editsnipe",
    description: "Show the last edited message",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const entries = Array.from(editedMessages.entries()).filter(([, v]) => v.after && v.before !== v.after);
      if (!entries.length) return sendBotMsg(ctx.channel.id, "❌ No edited messages cached.");
      const [, last] = entries[entries.length - 1];
      sendBotMsg(ctx.channel.id, `✏️ **Edit Snipe**\n👤 **${last.author}**\n📝 Before: ${last.before}\n📝 After: ${last.after}`);
    },
  }),

  registerCommand({
    name: "ghostping",
    displayName: "ghostping",
    description: "Send a ping then immediately delete it",
    options: [{ name: "user", displayName: "user", description: "User ID or mention", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const user = getVal(args, "user")?.replace(/[<@!>]/g, "");
      const mention = `<@${user}>`;
      await sendRealMsg(ctx.channel.id, mention);
      await sleep(300);
      try {
        const { body: msgs } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages?limit=10` });
        const mine = msgs.find((m: any) => m.content === mention && m.author.id === UserStore.getCurrentUser().id);
        if (mine) await HTTP.del({ url: `/channels/${ctx.channel.id}/messages/${mine.id}` });
      } catch {}
    },
  }),

  registerCommand({
    name: "cleardm",
    displayName: "cleardm",
    description: "Delete your own messages from a DM channel",
    options: [
      { name: "amount", displayName: "amount", description: "How many to delete", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const amount = getVal(args, "amount") ?? 20;
      const me = UserStore.getCurrentUser();
      try {
        const { body: msgs } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages?limit=100` });
        const mine = msgs.filter((m: any) => m.author.id === me.id).slice(0, amount);
        let count = 0;
        for (const m of mine) {
          await HTTP.del({ url: `/channels/${ctx.channel.id}/messages/${m.id}` });
          count++;
          await sleep(200);
        }
        sendBotMsg(ctx.channel.id, `🧹 Cleared **${count}** DM messages.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "massdelete",
    displayName: "massdelete",
    description: "Delete your own messages across all visible messages",
    options: [
      { name: "amount", displayName: "amount", description: "Amount to delete", required: true, type: 4 },
      { name: "delay", displayName: "delay", description: "Delay ms", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const amount = getVal(args, "amount");
      const delay = getVal(args, "delay") ?? 150;
      const me = UserStore.getCurrentUser();
      try {
        const { body: msgs } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages?limit=100` });
        const mine = msgs.filter((m: any) => m.author.id === me.id).slice(0, amount);
        let count = 0;
        for (const m of mine) {
          await HTTP.del({ url: `/channels/${ctx.channel.id}/messages/${m.id}` });
          count++;
          await sleep(delay);
        }
        sendBotMsg(ctx.channel.id, `🗑️ Mass deleted **${count}** messages.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "autoreact",
    displayName: "autoreact",
    description: "React to the last N messages with an emoji",
    options: [
      { name: "emoji", displayName: "emoji", description: "Emoji to react with", required: true, type: 3 },
      { name: "count", displayName: "count", description: "Number of messages (default 5)", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const emoji = getVal(args, "emoji");
      const count = getVal(args, "count") ?? 5;
      try {
        const { body: msgs } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages?limit=${count}` });
        for (const m of msgs) {
          const enc = encodeURIComponent(emoji);
          await HTTP.put({ url: `/channels/${ctx.channel.id}/messages/${m.id}/reactions/${enc}/@me` });
          await sleep(300);
        }
        sendBotMsg(ctx.channel.id, `✅ Reacted with ${emoji} on **${msgs.length}** messages.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "autotype",
    displayName: "autotype",
    description: "Start or stop typing indicator in this channel",
    options: [{ name: "duration", displayName: "duration", description: "Duration in seconds (0 = stop)", required: true, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const duration = getVal(args, "duration");
      if (!duration) return sendBotMsg(ctx.channel.id, "⏹️ Typing stopped.");
      const end = Date.now() + duration * 1000;
      sendBotMsg(ctx.channel.id, `⌨️ Typing for **${duration}** seconds...`);
      while (Date.now() < end) {
        await HTTP.post({ url: `/channels/${ctx.channel.id}/typing`, body: {} });
        await sleep(8000);
      }
    },
  }),

  registerCommand({
    name: "emojispam",
    displayName: "emojispam",
    description: "Spam an emoji repeatedly",
    options: [
      { name: "emoji", displayName: "emoji", description: "Emoji to spam", required: true, type: 3 },
      { name: "amount", displayName: "amount", description: "Repetitions", required: true, type: 4 },
      { name: "delay", displayName: "delay", description: "Delay ms", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const emoji = getVal(args, "emoji");
      const amount = Math.min(getVal(args, "amount") ?? 5, 50);
      const delay = getVal(args, "delay") ?? 500;
      for (let i = 0; i < amount; i++) {
        await sleep(delay);
        await sendRealMsg(ctx.channel.id, emoji.repeat(10));
      }
    },
  }),

  registerCommand({
    name: "textspam",
    displayName: "textspam",
    description: "Spam custom text repeatedly",
    options: [
      { name: "text", displayName: "text", description: "Text to spam", required: true, type: 3 },
      { name: "amount", displayName: "amount", description: "Times", required: true, type: 4 },
      { name: "delay", displayName: "delay", description: "Delay ms", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const text = getVal(args, "text");
      const amount = Math.min(getVal(args, "amount") ?? 5, 50);
      const delay = getVal(args, "delay") ?? 500;
      for (let i = 0; i < amount; i++) {
        await sleep(delay);
        await sendRealMsg(ctx.channel.id, text);
      }
    },
  }),

  registerCommand({
    name: "archivechat",
    displayName: "archivechat",
    description: "Archive recent chat messages as text in DMs",
    options: [{ name: "amount", displayName: "amount", description: "Number of messages to archive", required: false, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const amount = getVal(args, "amount") ?? 50;
      try {
        const { body: msgs } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages?limit=${Math.min(amount, 100)}` });
        const archive = msgs.reverse().map((m: any) => `[${new Date(m.timestamp).toLocaleString()}] ${m.author.username}: ${m.content}`).join("\n");
        const me = UserStore.getCurrentUser();
        const { body: dmChannel } = await HTTP.post({ url: "/users/@me/channels", body: { recipient_id: me.id } });
        await sendRealMsg(dmChannel.id, `📂 **Chat Archive** (${msgs.length} messages):\n\`\`\`\n${archive.slice(0, 1800)}\n\`\`\``);
        sendBotMsg(ctx.channel.id, `✅ Archive of **${msgs.length}** messages sent to your DMs.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "savemessage",
    displayName: "savemessage",
    description: "Save a message by ID to your notes",
    options: [{ name: "id", displayName: "id", description: "Message ID", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const id = getVal(args, "id");
      try {
        const { body: msg } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages/${id}` });
        if (!storage.notes) storage.notes = [];
        storage.notes.push(`[Saved from ${msg.author.username}]: ${msg.content}`);
        sendBotMsg(ctx.channel.id, `💾 Message saved to notes: **${msg.content.slice(0, 80)}**`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "remind",
    displayName: "remind",
    description: "Set a reminder",
    options: [
      { name: "time", displayName: "time", description: "Time in seconds", required: true, type: 4 },
      { name: "task", displayName: "task", description: "What to remind about", required: true, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const time = getVal(args, "time");
      const task = getVal(args, "task");
      sendBotMsg(ctx.channel.id, `⏰ Reminder set for **${time}** seconds: ${task}`);
      setTimeout(() => {
        sendBotMsg(ctx.channel.id, `🔔 **REMINDER:** ${task}`);
      }, time * 1000);
    },
  }),

  registerCommand({
    name: "timer",
    displayName: "timer",
    description: "Start a countdown timer",
    options: [{ name: "seconds", displayName: "seconds", description: "Time in seconds", required: true, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const seconds = getVal(args, "seconds");
      sendBotMsg(ctx.channel.id, `⏱️ Timer started: **${seconds}** seconds`);
      setTimeout(() => sendBotMsg(ctx.channel.id, `✅ **Timer done!** (${seconds}s)`), seconds * 1000);
    },
  }),

  registerCommand({
    name: "notesadd",
    displayName: "notesadd",
    description: "Add a note",
    options: [{ name: "note", displayName: "note", description: "Note content", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      if (!storage.notes) storage.notes = [];
      storage.notes.push(getVal(args, "note"));
      sendBotMsg(ctx.channel.id, `📝 Note added (#${storage.notes.length}).`);
    },
  }),

  registerCommand({
    name: "noteslist",
    displayName: "noteslist",
    description: "List all saved notes",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const notes = storage.notes || [];
      if (!notes.length) return sendBotMsg(ctx.channel.id, "📝 No notes saved.");
      sendBotMsg(ctx.channel.id, `📝 **Notes:**\n${notes.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}`);
    },
  }),

  registerCommand({
    name: "notesdelete",
    displayName: "notesdelete",
    description: "Delete a note by index",
    options: [{ name: "index", displayName: "index", description: "Note number", required: true, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const idx = getVal(args, "index") - 1;
      if (!storage.notes?.[idx]) return sendBotMsg(ctx.channel.id, "❌ Note not found.");
      storage.notes.splice(idx, 1);
      sendBotMsg(ctx.channel.id, `🗑️ Note **#${idx + 1}** deleted.`);
    },
  }),

  registerCommand({
    name: "tagadd",
    displayName: "tagadd",
    description: "Add a tag (saved message template)",
    options: [
      { name: "name", displayName: "name", description: "Tag name", required: true, type: 3 },
      { name: "content", displayName: "content", description: "Tag content", required: true, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const name = getVal(args, "name");
      const content = getVal(args, "content");
      if (!storage.tags) storage.tags = {};
      storage.tags[name] = content;
      sendBotMsg(ctx.channel.id, `🏷️ Tag **${name}** saved.`);
    },
  }),

  registerCommand({
    name: "tagsend",
    displayName: "tagsend",
    description: "Send a saved tag",
    options: [{ name: "name", displayName: "name", description: "Tag name", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const name = getVal(args, "name");
      const content = storage.tags?.[name];
      if (!content) return sendBotMsg(ctx.channel.id, `❌ Tag **${name}** not found.`);
      sendRealMsg(ctx.channel.id, content);
    },
  }),

  registerCommand({
    name: "taglist",
    displayName: "taglist",
    description: "List all saved tags",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const tags = Object.keys(storage.tags || {});
      if (!tags.length) return sendBotMsg(ctx.channel.id, "❌ No tags saved.");
      sendBotMsg(ctx.channel.id, `🏷️ **Tags:** ${tags.join(", ")}`);
    },
  }),

  registerCommand({
    name: "quickcalc",
    displayName: "quickcalc",
    description: "Quickly calculate an expression",
    options: [{ name: "expr", displayName: "expr", description: "Expression", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      try {
        const res = Function(`return ${getVal(args, "expr")}`)();
        sendBotMsg(ctx.channel.id, `🧮 \`${getVal(args, "expr")}\` = **${res}**`);
      } catch {
        sendBotMsg(ctx.channel.id, "❌ Invalid expression.");
      }
    },
  }),

  registerCommand({
    name: "quicksearch",
    displayName: "quicksearch",
    description: "Get a Google search link",
    options: [{ name: "query", displayName: "query", description: "Search query", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const q = encodeURIComponent(getVal(args, "query"));
      sendRealMsg(ctx.channel.id, `🔍 https://www.google.com/search?q=${q}`);
    },
  }),

  registerCommand({
    name: "weather",
    displayName: "weather",
    description: "Get weather for a city",
    options: [{ name: "city", displayName: "city", description: "City name", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const city = getVal(args, "city");
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
        const text = await res.text();
        sendBotMsg(ctx.channel.id, `🌤️ **Weather:** ${text.trim()}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error fetching weather: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "time",
    displayName: "time",
    description: "Show current time",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const now = new Date();
      sendBotMsg(ctx.channel.id, `🕐 **Current Time:** ${now.toLocaleString()} (UTC${-now.getTimezoneOffset() / 60 >= 0 ? "+" : ""}${-now.getTimezoneOffset() / 60})`);
    },
  }),

  registerCommand({
    name: "uptime",
    displayName: "uptime",
    description: "Show how long the plugin has been running",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const ms = Date.now() - pluginStartTime;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      sendBotMsg(ctx.channel.id, `⏱️ **Plugin Uptime:** ${h}h ${m}m ${s}s`);
    },
  }),

  registerCommand({
    name: "avatar",
    displayName: "avatar",
    description: "Get a user's avatar",
    options: [{ name: "user", displayName: "user", description: "User ID or mention", required: false, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const raw = getVal(args, "user");
      const id = raw ? raw.replace(/[<@!>]/g, "") : UserStore.getCurrentUser().id;
      const user = UserStore.getUser(id);
      if (!user) return sendBotMsg(ctx.channel.id, "❌ User not found.");
      const url = user.getAvatarURL?.({ format: "png", size: 1024 }) || `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator) % 5}.png`;
      sendBotMsg(ctx.channel.id, `🖼️ **${user.username}'s Avatar:**\n${url}`);
    },
  }),

  registerCommand({
    name: "banner",
    displayName: "banner",
    description: "Get a user's profile banner",
    options: [{ name: "user", displayName: "user", description: "User ID or mention", required: false, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const raw = getVal(args, "user");
      const id = raw ? raw.replace(/[<@!>]/g, "") : UserStore.getCurrentUser().id;
      try {
        const { body: user } = await HTTP.get({ url: `/users/${id}` });
        if (!user.banner) return sendBotMsg(ctx.channel.id, "❌ This user has no banner.");
        const ext = user.banner.startsWith("a_") ? "gif" : "png";
        const url = `https://cdn.discordapp.com/banners/${id}/${user.banner}.${ext}?size=1024`;
        sendBotMsg(ctx.channel.id, `🎨 **Banner:**\n${url}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "userinfo",
    displayName: "userinfo",
    description: "Get info about a user",
    options: [{ name: "user", displayName: "user", description: "User ID or mention", required: false, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const raw = getVal(args, "user");
      const id = raw ? raw.replace(/[<@!>]/g, "") : UserStore.getCurrentUser().id;
      const user = UserStore.getUser(id);
      if (!user) return sendBotMsg(ctx.channel.id, "❌ User not found.");
      const created = new Date(Number((BigInt(user.id) >> 22n) + 1420070400000n));
      sendBotMsg(ctx.channel.id, `👤 **${user.username}#${user.discriminator}**\n🆔 \`${user.id}\`\n🤖 Bot: ${user.bot ? "Yes" : "No"}\n📅 Created: ${created.toDateString()}`);
    },
  }),

  registerCommand({
    name: "userlookup",
    displayName: "userlookup",
    description: "Look up a user by ID via API",
    options: [{ name: "id", displayName: "id", description: "User ID", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const id = getVal(args, "id");
      try {
        const { body: user } = await HTTP.get({ url: `/users/${id}` });
        const created = new Date(Number((BigInt(user.id) >> 22n) + 1420070400000n));
        sendBotMsg(ctx.channel.id, `🔍 **${user.username}#${user.discriminator}**\n🆔 \`${user.id}\`\n🤖 Bot: ${user.bot ? "Yes" : "No"}\n📅 Created: ${created.toDateString()}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "idlookup",
    displayName: "idlookup",
    description: "Show info encoded in a Discord snowflake ID",
    options: [{ name: "id", displayName: "id", description: "Snowflake ID", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const id = getVal(args, "id");
      try {
        const ts = Number((BigInt(id) >> 22n) + 1420070400000n);
        const date = new Date(ts);
        sendBotMsg(ctx.channel.id, `🔢 **Snowflake:** \`${id}\`\n📅 Created: ${date.toUTCString()}\n⏱️ Timestamp: ${ts}`);
      } catch {
        sendBotMsg(ctx.channel.id, "❌ Invalid ID.");
      }
    },
  }),

  registerCommand({
    name: "rolelist",
    displayName: "rolelist",
    description: "List all roles in the server",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const guild = GuildStore.getGuild(ctx.channel.guild_id);
      if (!guild) return sendBotMsg(ctx.channel.id, "❌ Not in a server.");
      const roles = Object.values(guild.roles || {}) as any[];
      const list = roles.map((r: any) => `• **${r.name}** (\`${r.id}\`)`).join("\n").slice(0, 1800);
      sendBotMsg(ctx.channel.id, `🎭 **Roles (${roles.length}):**\n${list}`);
    },
  }),

  registerCommand({
    name: "channellist",
    displayName: "channellist",
    description: "List all channels in the server",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const guild = GuildStore.getGuild(ctx.channel.guild_id);
      if (!guild) return sendBotMsg(ctx.channel.id, "❌ Not in a server.");
      const channels = Object.values(GuildStore.getGuildChannels ? GuildStore.getGuildChannels(guild.id) : {}) as any[];
      const list = channels.map((c: any) => `• #${c.name} (\`${c.id}\`)`).join("\n").slice(0, 1800);
      sendBotMsg(ctx.channel.id, `📢 **Channels:**\n${list || "Unable to fetch channels."}`);
    },
  }),

  registerCommand({
    name: "serverlist",
    displayName: "serverlist",
    description: "List all servers you are in",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const guilds = Object.values(GuildStore.getGuilds()) as any[];
      const list = guilds.map((g: any) => `• **${g.name}** (\`${g.id}\`)`).join("\n").slice(0, 1800);
      sendBotMsg(ctx.channel.id, `🌐 **Servers (${guilds.length}):**\n${list}`);
    },
  }),

  registerCommand({
    name: "keywordalert",
    displayName: "keywordalert",
    description: "Add or remove a keyword alert",
    options: [
      { name: "action", displayName: "action", description: "add/remove/list", required: true, type: 3 },
      { name: "keyword", displayName: "keyword", description: "Keyword", required: false, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const action = getVal(args, "action");
      const kw = getVal(args, "keyword");
      if (!storage.keywordAlerts) storage.keywordAlerts = [];
      if (action === "add" && kw) {
        storage.keywordAlerts.push(kw);
        sendBotMsg(ctx.channel.id, `🔔 Keyword alert added: **${kw}**`);
      } else if (action === "remove" && kw) {
        storage.keywordAlerts = storage.keywordAlerts.filter((k: string) => k !== kw);
        sendBotMsg(ctx.channel.id, `🔕 Keyword alert removed: **${kw}**`);
      } else if (action === "list") {
        sendBotMsg(ctx.channel.id, `🔔 **Keyword Alerts:** ${storage.keywordAlerts.join(", ") || "None"}`);
      }
    },
  }),

  registerCommand({
    name: "deletedlogger",
    displayName: "deletedlogger",
    description: "Toggle deleted message logger",
    options: [{ name: "channel", displayName: "channel", description: "Log channel ID (current if blank)", required: false, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      storage.deletedLoggerEnabled = !storage.deletedLoggerEnabled;
      storage.deletedLogChannel = getVal(args, "channel") || ctx.channel.id;
      sendBotMsg(ctx.channel.id, `🗑️ Deleted message logger **${storage.deletedLoggerEnabled ? "enabled" : "disabled"}** → <#${storage.deletedLogChannel}>`);
    },
  }),

  registerCommand({
    name: "editlogger",
    displayName: "editlogger",
    description: "Toggle edited message logger",
    options: [{ name: "channel", displayName: "channel", description: "Log channel ID (current if blank)", required: false, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      storage.editLoggerEnabled = !storage.editLoggerEnabled;
      storage.editLogChannel = getVal(args, "channel") || ctx.channel.id;
      sendBotMsg(ctx.channel.id, `✏️ Edit message logger **${storage.editLoggerEnabled ? "enabled" : "disabled"}** → <#${storage.editLogChannel}>`);
    },
  }),

  registerCommand({
    name: "quotesave",
    displayName: "quotesave",
    description: "Save a quote by message ID",
    options: [{ name: "id", displayName: "id", description: "Message ID", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const id = getVal(args, "id");
      try {
        const { body: msg } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages/${id}` });
        if (!storage.savedQuotes) storage.savedQuotes = [];
        storage.savedQuotes.push({ content: msg.content, author: msg.author.username, timestamp: msg.timestamp });
        sendBotMsg(ctx.channel.id, `💬 Quote saved from **${msg.author.username}**.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "quoterandom",
    displayName: "quoterandom",
    description: "Show a random saved quote",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const quotes = storage.savedQuotes || [];
      if (!quotes.length) return sendBotMsg(ctx.channel.id, "❌ No quotes saved.");
      const q = quotes[Math.floor(Math.random() * quotes.length)];
      sendBotMsg(ctx.channel.id, `💬 *"${q.content}"*\n— **${q.author}**`);
    },
  }),

  registerCommand({
    name: "macroadd",
    displayName: "macroadd",
    description: "Add a macro (name → message)",
    options: [
      { name: "name", displayName: "name", description: "Macro name", required: true, type: 3 },
      { name: "content", displayName: "content", description: "Macro content", required: true, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const name = getVal(args, "name");
      const content = getVal(args, "content");
      if (!storage.macros) storage.macros = {};
      storage.macros[name] = content;
      sendBotMsg(ctx.channel.id, `⚡ Macro **${name}** saved.`);
    },
  }),

  registerCommand({
    name: "macrorun",
    displayName: "macrorun",
    description: "Run a saved macro",
    options: [{ name: "name", displayName: "name", description: "Macro name", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const name = getVal(args, "name");
      const content = storage.macros?.[name];
      if (!content) return sendBotMsg(ctx.channel.id, `❌ Macro **${name}** not found.`);
      sendRealMsg(ctx.channel.id, content);
    },
  }),

  registerCommand({
    name: "macrolist",
    displayName: "macrolist",
    description: "List all saved macros",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const macros = Object.keys(storage.macros || {});
      if (!macros.length) return sendBotMsg(ctx.channel.id, "❌ No macros saved.");
      sendBotMsg(ctx.channel.id, `⚡ **Macros:** ${macros.join(", ")}`);
    },
  }),

  registerCommand({
    name: "aliasadd",
    displayName: "aliasadd",
    description: "Add an alias for a command",
    options: [
      { name: "alias", displayName: "alias", description: "Alias name", required: true, type: 3 },
      { name: "command", displayName: "command", description: "Command to run", required: true, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const alias = getVal(args, "alias");
      const command = getVal(args, "command");
      if (!storage.aliases) storage.aliases = {};
      storage.aliases[alias] = command;
      sendBotMsg(ctx.channel.id, `🔗 Alias **${alias}** → **${command}** added.`);
    },
  }),

  registerCommand({
    name: "aliasremove",
    displayName: "aliasremove",
    description: "Remove a saved alias",
    options: [{ name: "alias", displayName: "alias", description: "Alias to remove", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const alias = getVal(args, "alias");
      if (!storage.aliases?.[alias]) return sendBotMsg(ctx.channel.id, `❌ Alias **${alias}** not found.`);
      delete storage.aliases[alias];
      sendBotMsg(ctx.channel.id, `🗑️ Alias **${alias}** removed.`);
    },
  }),

  registerCommand({
    name: "aliaslist",
    displayName: "aliaslist",
    description: "List all saved aliases",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const aliases = Object.entries(storage.aliases || {});
      if (!aliases.length) return sendBotMsg(ctx.channel.id, "❌ No aliases saved.");
      sendBotMsg(ctx.channel.id, `🔗 **Aliases:**\n${aliases.map(([a, c]) => `• **${a}** → ${c}`).join("\n")}`);
    },
  }),

  registerCommand({
    name: "repeat",
    displayName: "repeat",
    description: "Repeat a message N times",
    options: [
      { name: "message", displayName: "message", description: "Message to send", required: true, type: 3 },
      { name: "times", displayName: "times", description: "Repetitions", required: true, type: 4 },
      { name: "delay", displayName: "delay", description: "Delay ms", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const msg = getVal(args, "message");
      const times = Math.min(getVal(args, "times"), 50);
      const delay = getVal(args, "delay") ?? 500;
      for (let i = 0; i < times; i++) {
        await sleep(delay);
        sendRealMsg(ctx.channel.id, msg);
      }
    },
  }),

  registerCommand({
    name: "countdown",
    displayName: "countdown",
    description: "Post a visible countdown",
    options: [{ name: "from", displayName: "from", description: "Count from (max 10)", required: true, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const from = Math.min(getVal(args, "from"), 10);
      for (let i = from; i >= 0; i--) {
        sendBotMsg(ctx.channel.id, i === 0 ? "🚀 **GO!**" : `⏳ **${i}**`);
        await sleep(1000);
      }
    },
  }),

  registerCommand({
    name: "stopwatch",
    displayName: "stopwatch",
    description: "Start or stop a stopwatch",
    options: [{ name: "action", displayName: "action", description: "start/stop", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const action = getVal(args, "action");
      if (action === "start") {
        stopwatchStart = Date.now();
        sendBotMsg(ctx.channel.id, "⏱️ Stopwatch **started**.");
      } else if (action === "stop") {
        if (!stopwatchStart) return sendBotMsg(ctx.channel.id, "❌ Stopwatch not running.");
        const elapsed = Date.now() - stopwatchStart;
        stopwatchStart = null;
        const s = (elapsed / 1000).toFixed(2);
        sendBotMsg(ctx.channel.id, `🏁 Stopwatch **stopped**: **${s}** seconds`);
      } else {
        sendBotMsg(ctx.channel.id, "❌ Use start or stop.");
      }
    },
  }),

  registerCommand({
    name: "pollquick",
    displayName: "pollquick",
    description: "Create a quick poll",
    options: [
      { name: "question", displayName: "question", description: "Poll question", required: true, type: 3 },
      { name: "options", displayName: "options", description: "Options (comma separated)", required: true, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const question = getVal(args, "question");
      const optionList = getVal(args, "options").split(",").map((o: string, i: number) => `${["🇦","🇧","🇨","🇩","🇪"][i] || String(i+1)}️ ${o.trim()}`);
      sendRealMsg(ctx.channel.id, `📊 **${question}**\n${optionList.join("\n")}`);
    },
  }),

  registerCommand({
    name: "dice",
    displayName: "dice",
    description: "Roll a die",
    options: [{ name: "sides", displayName: "sides", description: "Number of sides (default 6)", required: false, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const sides = getVal(args, "sides") ?? 6;
      const result = Math.floor(Math.random() * sides) + 1;
      sendRealMsg(ctx.channel.id, `🎲 Rolled a d${sides}: **${result}**`);
    },
  }),

  registerCommand({
    name: "randomnumber",
    displayName: "randomnumber",
    description: "Generate a random number",
    options: [
      { name: "min", displayName: "min", description: "Minimum", required: false, type: 4 },
      { name: "max", displayName: "max", description: "Maximum", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const min = getVal(args, "min") ?? 1;
      const max = getVal(args, "max") ?? 100;
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      sendRealMsg(ctx.channel.id, `🎰 Random number (${min}–${max}): **${result}**`);
    },
  }),

  registerCommand({
    name: "choose",
    displayName: "choose",
    description: "Randomly choose from options",
    options: [{ name: "options", displayName: "options", description: "Comma-separated options", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const opts = getVal(args, "options").split(",").map((s: string) => s.trim());
      const picked = opts[Math.floor(Math.random() * opts.length)];
      sendRealMsg(ctx.channel.id, `🎯 I choose: **${picked}**`);
    },
  }),

  registerCommand({
    name: "passwordgen",
    displayName: "passwordgen",
    description: "Generate a secure password",
    options: [{ name: "length", displayName: "length", description: "Password length (default 16)", required: false, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const len = getVal(args, "length") ?? 16;
      sendBotMsg(ctx.channel.id, `🔑 **Password:** \`${genPassword(len)}\``);
    },
  }),

  registerCommand({
    name: "colorgen",
    displayName: "colorgen",
    description: "Generate a random hex color",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const color = `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, "0")}`;
      sendBotMsg(ctx.channel.id, `🎨 Random color: **${color}** — https://www.color-hex.com/color/${color.slice(1)}`);
    },
  }),

  registerCommand({
    name: "textreverse",
    displayName: "textreverse",
    description: "Reverse text",
    options: [{ name: "text", displayName: "text", description: "Text to reverse", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const text = getVal(args, "text");
      sendRealMsg(ctx.channel.id, text.split("").reverse().join(""));
    },
  }),

  registerCommand({
    name: "textzalgo",
    displayName: "textzalgo",
    description: "Convert text to zalgo",
    options: [{ name: "text", displayName: "text", description: "Text to zalgo-ify", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toZalgo(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "textfancy",
    displayName: "textfancy",
    description: "Convert text to fancy cursive",
    options: [{ name: "text", displayName: "text", description: "Text to make fancy", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toFancy(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "textascii",
    displayName: "textascii",
    description: "Convert text to ASCII art",
    options: [{ name: "text", displayName: "text", description: "Text to render", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toAsciiArt(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "hash",
    displayName: "hash",
    description: "Hash text with a simple hash function",
    options: [{ name: "text", displayName: "text", description: "Text to hash", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const h = toHash(getVal(args, "text"));
      sendBotMsg(ctx.channel.id, `#️⃣ **Hash:** \`${h.toString(16).padStart(8, "0")}\` (${h})`);
    },
  }),

  registerCommand({
    name: "base64encode",
    displayName: "base64encode",
    description: "Encode text to Base64",
    options: [{ name: "text", displayName: "text", description: "Text to encode", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendBotMsg(ctx.channel.id, `🔒 **Base64:** \`${toBase64(getVal(args, "text"))}\``);
    },
  }),

  registerCommand({
    name: "base64decode",
    displayName: "base64decode",
    description: "Decode Base64 to text",
    options: [{ name: "text", displayName: "text", description: "Base64 to decode", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      try {
        sendBotMsg(ctx.channel.id, `🔓 **Decoded:** ${fromBase64(getVal(args, "text"))}`);
      } catch {
        sendBotMsg(ctx.channel.id, "❌ Invalid Base64.");
      }
    },
  }),

  registerCommand({
    name: "ping",
    displayName: "ping",
    description: "Check plugin latency",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const start = Date.now();
      sendBotMsg(ctx.channel.id, `🏓 Pong! Latency: **${Date.now() - start}ms**`);
    },
  }),

  registerCommand({
    name: "help",
    displayName: "help",
    description: "List all available commands",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const cmds = [
        "gemini, math, serverinfo, coinflip, raid, fetchprofile, purge",
        "afk, autoreply, snipe, editsnipe, ghostping, cleardm, massdelete",
        "autoreact, autotype, emojispam, textspam, archivechat, savemessage",
        "remind, timer, notesadd, noteslist, notesdelete",
        "tagadd, tagsend, taglist, quickcalc, quicksearch, weather, time, uptime",
        "avatar, banner, userinfo, userlookup, idlookup, rolelist, channellist, serverlist",
        "keywordalert, deletedlogger, editlogger, quotesave, quoterandom",
        "macroadd, macrorun, macrolist, aliasadd, aliasremove, aliaslist",
        "repeat, countdown, stopwatch, pollquick, dice, randomnumber, choose",
        "passwordgen, colorgen, textreverse, textzalgo, textfancy, textascii, hash",
        "base64encode, base64decode, ping, help, mock, clap, vapor, regional",
        "spoiler, l33t, tiny, shrug, tableflip, unflip, lenny, 8ball, rps",
        "todoadd, todolist, evaluate, worldtime, binary, hex, urban, selfdestruct",
        "nick, slowmode, kick, ban, cat, dog, mcskin, mcstatus, status, blocklist",
      ];
      sendBotMsg(ctx.channel.id, `📋 **Commands:**\n${cmds.join("\n")}`);
    },
  }),

  registerCommand({
    name: "mock",
    displayName: "mock",
    description: "mOcK sOmEoNe'S tExT",
    options: [{ name: "text", displayName: "text", description: "Text to mock", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toMock(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "clap",
    displayName: "clap",
    description: "Add 👏 between every word",
    options: [{ name: "text", displayName: "text", description: "Text", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, getVal(args, "text").split(" ").join(" 👏 "));
    },
  }),

  registerCommand({
    name: "vapor",
    displayName: "vapor",
    description: "s p a c e d  o u t  t e x t",
    options: [{ name: "text", displayName: "text", description: "Text to vaporwave", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toVapor(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "regional",
    displayName: "regional",
    description: "🇨 🇴 🇳 🇻 🇪 🇷 🇹 text to regional emoji",
    options: [{ name: "text", displayName: "text", description: "Text", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toRegional(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "spoiler",
    displayName: "spoiler",
    description: "Wrap every character in spoiler tags",
    options: [{ name: "text", displayName: "text", description: "Text to spoiler", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, getVal(args, "text").split("").map((c: string) => `||${c}||`).join(""));
    },
  }),

  registerCommand({
    name: "l33t",
    displayName: "l33t",
    description: "3nC0d3 73x7 1n l33tsp34k",
    options: [{ name: "text", displayName: "text", description: "Text to l33t", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toL33t(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "tiny",
    displayName: "tiny",
    description: "ᵗⁱⁿʸ ˢᵘᵖᵉʳˢᶜʳⁱᵖᵗ text",
    options: [{ name: "text", displayName: "text", description: "Text to make tiny", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendRealMsg(ctx.channel.id, toTiny(getVal(args, "text")));
    },
  }),

  registerCommand({
    name: "shrug",
    displayName: "shrug",
    description: "¯\\_(ツ)_/¯",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      sendRealMsg(ctx.channel.id, "¯\\_(ツ)_/¯");
    },
  }),

  registerCommand({
    name: "tableflip",
    displayName: "tableflip",
    description: "(╯°□°）╯︵ ┻━┻",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      sendRealMsg(ctx.channel.id, "(╯°□°）╯︵ ┻━┻");
    },
  }),

  registerCommand({
    name: "unflip",
    displayName: "unflip",
    description: "┬─┬ノ( º _ ºノ)",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      sendRealMsg(ctx.channel.id, "┬─┬ノ( º _ ºノ)");
    },
  }),

  registerCommand({
    name: "lenny",
    displayName: "lenny",
    description: "( ͡° ͜ʖ ͡°)",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      sendRealMsg(ctx.channel.id, "( ͡° ͜ʖ ͡°)");
    },
  }),

  registerCommand({
    name: "8ball",
    displayName: "8ball",
    description: "Ask the magic 8-ball",
    options: [{ name: "question", displayName: "question", description: "Your question", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const answer = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
      sendRealMsg(ctx.channel.id, `🎱 *${getVal(args, "question")}*\n> ${answer}`);
    },
  }),

  registerCommand({
    name: "rps",
    displayName: "rps",
    description: "Play Rock Paper Scissors",
    options: [{ name: "choice", displayName: "choice", description: "rock/paper/scissors", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const choices = ["rock", "paper", "scissors"];
      const emojis: Record<string, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
      const player = getVal(args, "choice").toLowerCase();
      if (!choices.includes(player)) return sendBotMsg(ctx.channel.id, "❌ Choose rock, paper, or scissors.");
      const bot = choices[Math.floor(Math.random() * 3)];
      const wins: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
      const result = player === bot ? "It's a tie!" : wins[player] === bot ? "You win! 🎉" : "You lose! 😔";
      sendRealMsg(ctx.channel.id, `You: ${emojis[player]} vs Me: ${emojis[bot]} — **${result}**`);
    },
  }),

  registerCommand({
    name: "todoadd",
    displayName: "todoadd",
    description: "Add a todo item",
    options: [{ name: "task", displayName: "task", description: "Task to add", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      if (!storage.todos) storage.todos = [];
      storage.todos.push({ task: getVal(args, "task"), done: false });
      sendBotMsg(ctx.channel.id, `✅ Todo #${storage.todos.length} added.`);
    },
  }),

  registerCommand({
    name: "todolist",
    displayName: "todolist",
    description: "List all todo items",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (_, ctx) => {
      const todos = storage.todos || [];
      if (!todos.length) return sendBotMsg(ctx.channel.id, "📋 No todos.");
      const list = todos.map((t: any, i: number) => `${t.done ? "✅" : "⬜"} ${i + 1}. ${t.task}`).join("\n");
      sendBotMsg(ctx.channel.id, `📋 **Todos:**\n${list}`);
    },
  }),

  registerCommand({
    name: "evaluate",
    displayName: "evaluate",
    description: "Evaluate a JavaScript expression",
    options: [{ name: "code", displayName: "code", description: "JS code to evaluate", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      try {
        const result = Function(`"use strict"; return (${getVal(args, "code")})`)();
        sendBotMsg(ctx.channel.id, `✅ \`\`\`js\n${JSON.stringify(result, null, 2)?.slice(0, 1500)}\`\`\``);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `❌ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "worldtime",
    displayName: "worldtime",
    description: "Show current time in a timezone",
    options: [{ name: "timezone", displayName: "timezone", description: "e.g. America/New_York", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      try {
        const tz = getVal(args, "timezone");
        const time = new Date().toLocaleString("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "long" });
        sendBotMsg(ctx.channel.id, `🌍 **${tz}:** ${time}`);
      } catch {
        sendBotMsg(ctx.channel.id, "❌ Invalid timezone. Try e.g. America/New_York");
      }
    },
  }),

  registerCommand({
    name: "binary",
    displayName: "binary",
    description: "Convert text to binary",
    options: [{ name: "text", displayName: "text", description: "Text to convert", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendBotMsg(ctx.channel.id, `01 **Binary:** \`${toBinary(getVal(args, "text")).slice(0, 1800)}\``);
    },
  }),

  registerCommand({
    name: "hex",
    displayName: "hex",
    description: "Convert text to hexadecimal",
    options: [{ name: "text", displayName: "text", description: "Text to convert", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      sendBotMsg(ctx.channel.id, `🔢 **Hex:** \`${toHex(getVal(args, "text"))}\``);
    },
  }),

  registerCommand({
    name: "urban",
    displayName: "urban",
    description: "Look up a word on Urban Dictionary",
    options: [{ name: "word", displayName: "word", description: "Word to define", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const word = getVal(args, "word");
      try {
        const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
        const data = await res.json();
        const entry = data.list?.[0];
        if (!entry) return sendBotMsg(ctx.channel.id, `❌ No definition found for **${word}**.`);
        sendBotMsg(ctx.channel.id, `📖 **${entry.word}**\n${entry.definition.slice(0, 800)}\n\n*Example: ${entry.example?.slice(0, 300) || "N/A"}*`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "selfdestruct",
    displayName: "selfdestruct",
    description: "Send a message that auto-deletes after X seconds",
    options: [
      { name: "message", displayName: "message", description: "Message to send", required: true, type: 3 },
      { name: "delay", displayName: "delay", description: "Delete after (seconds)", required: true, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const msg = getVal(args, "message");
      const delay = getVal(args, "delay");
      await sendRealMsg(ctx.channel.id, `💣 *[self-destruct in ${delay}s]* ${msg}`);
      await sleep(delay * 1000);
      try {
        const { body: msgs } = await HTTP.get({ url: `/channels/${ctx.channel.id}/messages?limit=10` });
        const mine = msgs.find((m: any) => m.content.includes(msg) && m.author.id === UserStore.getCurrentUser().id);
        if (mine) await HTTP.del({ url: `/channels/${ctx.channel.id}/messages/${mine.id}` });
      } catch {}
    },
  }),

  registerCommand({
    name: "nick",
    displayName: "nick",
    description: "Change your nickname in this server",
    options: [{ name: "name", displayName: "name", description: "New nickname (blank to reset)", required: false, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const name = getVal(args, "name") || null;
      const me = UserStore.getCurrentUser();
      try {
        await HTTP.patch({ url: `/guilds/${ctx.channel.guild_id}/members/@me`, body: { nick: name } });
        sendBotMsg(ctx.channel.id, `✅ Nickname ${name ? `changed to **${name}**` : "**reset**"}.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "slowmode",
    displayName: "slowmode",
    description: "Set channel slowmode",
    options: [{ name: "seconds", displayName: "seconds", description: "Slowmode delay in seconds (0 = off)", required: true, type: 4 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const rate = getVal(args, "seconds");
      try {
        await HTTP.patch({ url: `/channels/${ctx.channel.id}`, body: { rate_limit_per_user: rate } });
        sendBotMsg(ctx.channel.id, `🐌 Slowmode set to **${rate}** seconds.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "kick",
    displayName: "kick",
    description: "Kick a member from the server",
    options: [
      { name: "user", displayName: "user", description: "User ID or mention", required: true, type: 3 },
      { name: "reason", displayName: "reason", description: "Reason", required: false, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const id = getVal(args, "user")?.replace(/[<@!>]/g, "");
      const reason = getVal(args, "reason") || "No reason provided";
      try {
        await HTTP.del({ url: `/guilds/${ctx.channel.guild_id}/members/${id}`, body: { reason } });
        sendBotMsg(ctx.channel.id, `👢 Kicked <@${id}>. Reason: ${reason}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "ban",
    displayName: "ban",
    description: "Ban a member from the server",
    options: [
      { name: "user", displayName: "user", description: "User ID or mention", required: true, type: 3 },
      { name: "reason", displayName: "reason", description: "Reason", required: false, type: 3 },
      { name: "days", displayName: "days", description: "Days of messages to delete (0-7)", required: false, type: 4 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const id = getVal(args, "user")?.replace(/[<@!>]/g, "");
      const reason = getVal(args, "reason") || "No reason provided";
      const days = getVal(args, "days") ?? 0;
      try {
        await HTTP.put({ url: `/guilds/${ctx.channel.guild_id}/bans/${id}`, body: { delete_message_days: days, reason } });
        sendBotMsg(ctx.channel.id, `🔨 Banned <@${id}>. Reason: ${reason}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "cat",
    displayName: "cat",
    description: "Random cat image",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (_, ctx) => {
      try {
        const res = await fetch("https://api.thecatapi.com/v1/images/search");
        const data = await res.json();
        sendRealMsg(ctx.channel.id, `🐱 ${data[0]?.url}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "dog",
    displayName: "dog",
    description: "Random dog image",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (_, ctx) => {
      try {
        const res = await fetch("https://dog.ceo/api/breeds/image/random");
        const data = await res.json();
        sendRealMsg(ctx.channel.id, `🐶 ${data.message}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "mcskin",
    displayName: "mcskin",
    description: "Fetch a Minecraft player skin",
    options: [{ name: "player", displayName: "player", description: "Player username", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const player = getVal(args, "player");
      try {
        const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${player}`);
        const data = await res.json();
        if (!data.id) return sendBotMsg(ctx.channel.id, `❌ Player **${player}** not found.`);
        const skinUrl = `https://crafatar.com/renders/body/${data.id}?overlay=true`;
        sendBotMsg(ctx.channel.id, `⛏️ **${player}'s Skin:**\n${skinUrl}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "mcstatus",
    displayName: "mcstatus",
    description: "Check if a Minecraft server is online",
    options: [{ name: "ip", displayName: "ip", description: "Server IP", required: true, type: 3 }],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const ip = getVal(args, "ip");
      try {
        const res = await fetch(`https://api.mcsrvstat.us/2/${ip}`);
        const data = await res.json();
        if (!data.online) return sendBotMsg(ctx.channel.id, `❌ **${ip}** is **offline** or unreachable.`);
        sendBotMsg(ctx.channel.id, `✅ **${ip}** — Online\n👥 Players: ${data.players?.online ?? 0}/${data.players?.max ?? 0}\n📋 MOTD: ${data.motd?.clean?.join(" ") || "N/A"}\n🕹️ Version: ${data.version || "Unknown"}`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "status",
    displayName: "status",
    description: "Set your Discord status",
    options: [
      { name: "type", displayName: "type", description: "online/idle/dnd/invisible", required: true, type: 3 },
      { name: "text", displayName: "text", description: "Custom status text", required: false, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: async (args, ctx) => {
      const type = getVal(args, "type");
      const text = getVal(args, "text");
      const validStatuses = ["online", "idle", "dnd", "invisible"];
      if (!validStatuses.includes(type)) return sendBotMsg(ctx.channel.id, `❌ Invalid status. Choose: ${validStatuses.join(", ")}`);
      try {
        await HTTP.patch({
          url: "/users/@me/settings",
          body: { status: type }
        });
        if (text) {
          await HTTP.patch({
            url: "/users/@me/settings",
            body: { custom_status: { text, emoji_name: null } }
          });
        }
        sendBotMsg(ctx.channel.id, `✅ Status set to **${type}**${text ? `: *${text}*` : ""}.`);
      } catch (e) {
        sendBotMsg(ctx.channel.id, `⚠️ Error: ${e}`);
      }
    },
  }),

  registerCommand({
    name: "blocklist",
    displayName: "blocklist",
    description: "Manage the plugin blocklist",
    options: [
      { name: "action", displayName: "action", description: "add/remove/list", required: true, type: 3 },
      { name: "user", displayName: "user", description: "User ID", required: false, type: 3 },
    ],
    applicationId: "-1",
    inputType: 1,
    type: 1,
    execute: (args, ctx) => {
      const action = getVal(args, "action");
      const user = getVal(args, "user");
      if (!storage.blocklist) storage.blocklist = [];
      if (action === "add" && user) {
        storage.blocklist.push(user);
        sendBotMsg(ctx.channel.id, `🚫 Added \`${user}\` to blocklist.`);
      } else if (action === "remove" && user) {
        storage.blocklist = storage.blocklist.filter((u: string) => u !== user);
        sendBotMsg(ctx.channel.id, `✅ Removed \`${user}\` from blocklist.`);
      } else if (action === "list") {
        sendBotMsg(ctx.channel.id, `🚫 **Blocklist:** ${storage.blocklist.join(", ") || "Empty"}`);
      }
    },
  })
);

const UserProfile = findByTypeName("UserProfile") || findByTypeName("UserProfileContent");
if (UserProfile) {
  patches.push(after("type", UserProfile, (args, ret) => {
    const sections = ret?.props?.children;
    const userId = args[0]?.userId ?? args[0]?.user?.id;
    if (sections && userId) sections.push(React.createElement(GiveawaySection, { userId }));
  }));
}

export default {
  onLoad: () => logger.log(`Plugin loaded with ${commands.length} commands.`),
  onUnload: () => {
    commands.forEach((u) => u());
    patches.forEach((u) => u());
    if (Dispatcher) {
      Dispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
      Dispatcher.unsubscribe("MESSAGE_UPDATE", onMessageUpdate);
      Dispatcher.unsubscribe("MESSAGE_DELETE", onMessageDelete);
    }
    logger.log("Plugin unloaded.");
  },
  settings: Settings,
};
