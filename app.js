const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();

const sampleChat = `2026-06-01 10:12 Mina Liu: 最近我們 Telegram AMA 互動變多，想找交易所一起做 launch campaign
2026-06-01 10:18 Me: 可以，我這週幫你看 CEX BD 名單
2026-05-26 21:08 Hana Kim: Market maker liquidity plan updated. We can discuss listing support this week.
2026-05-20 14:40 Sean Yu: 台灣 TG 社群最近討論很熱，六月可以一起做活動
2026-04-06 09:12 Daniel Lee: 如果你們需要 compliance 顧問，我可以介紹韓國那邊的律師
2026-03-03 18:22 Ryan Park: 上幣合作我們下週再 sync，budget 和 listing package 我整理一下
2026-02-21 11:03 Ivy Wang: 我這邊有幾個高淨值客戶在問 USDT 出入金與量化
2026-01-17 16:44 Grace Chen: 最近 IG 短影音觸及回升，有適合新手教育的 campaign 可以找我
2025-12-05 12:09 Victor Ng: 商會投資人聚會可以幫你介紹幾位做 crypto fund 的朋友`;

const els = {
  importInput: document.querySelector("#importInput"),
  analyzeButton: document.querySelector("#analyzeButton"),
  sampleButton: document.querySelector("#sampleButton"),
  folderButton: document.querySelector("#folderButton"),
  chatFile: document.querySelector("#chatFile"),
  folderInput: document.querySelector("#folderInput"),
  dropZone: document.querySelector("#dropZone"),
  fileStatus: document.querySelector("#fileStatus"),
  parsePreview: document.querySelector("#parsePreview"),
  platformButtons: document.querySelectorAll(".platform"),
  contactList: document.querySelector("#contactList"),
  actionList: document.querySelector("#actionList"),
  playbookList: document.querySelector("#playbookList"),
  template: document.querySelector("#contactTemplate"),
  filters: document.querySelectorAll(".filter"),
  connectorDialog: document.querySelector("#connectorDialog"),
  connectorTitle: document.querySelector("#connectorTitle"),
  connectorCopy: document.querySelector("#connectorCopy"),
  metrics: {
    total: document.querySelector("#metricTotal"),
    highValue: document.querySelector("#metricHighValue"),
    rising: document.querySelector("#metricRising"),
    health: document.querySelector("#metricHealth"),
    heroPriority: document.querySelector("#heroPriority"),
    heroDormant: document.querySelector("#heroDormant"),
    heroRisk: document.querySelector("#heroRisk")
  }
};

let activeFilter = "all";
let selectedPlatform = "auto";
let contacts = [];
let rawMessages = [];

function init() {
  els.importInput.value = sampleChat;
  wireEvents();
  analyzeText(sampleChat, "範例聊天紀錄");
}

function wireEvents() {
  els.analyzeButton.addEventListener("click", () => analyzeText(els.importInput.value, "貼上的聊天紀錄"));
  els.sampleButton.addEventListener("click", () => {
    els.importInput.value = sampleChat;
    analyzeText(sampleChat, "範例聊天紀錄");
  });
  els.chatFile.addEventListener("change", (event) => handleFiles(event.target.files));
  els.folderInput.addEventListener("change", (event) => handleFiles(event.target.files, { sourceType: "folder" }));
  els.folderButton.addEventListener("click", () => els.folderInput.click());

  ["dragenter", "dragover"].forEach((name) => {
    els.dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    els.dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragging");
    });
  });
  els.dropZone.addEventListener("drop", (event) => handleFiles(event.dataTransfer.files, { sourceType: "drop" }));

  els.platformButtons.forEach((button) => {
    button.addEventListener("click", () => {
      els.platformButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      selectedPlatform = button.dataset.platform;
    });
  });

  els.filters.forEach((button) => {
    button.addEventListener("click", () => {
      els.filters.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-connect]").forEach((button) => {
    button.addEventListener("click", () => openConnectorDialog(button.dataset.connect));
  });
}

async function handleFiles(fileList, options = {}) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const selected = selectUsefulFiles(files);
  if (!selected.length) {
    els.fileStatus.textContent = "這個資料夾沒有找到可解析的人脈資料。請確認有 messages、inbox、connections、followers 或 txt/json/html/csv 檔案。";
    return;
  }

  els.fileStatus.textContent = `正在掃描 ${files.length} 個檔案，挑出 ${selected.length} 個可能有用的資料檔...`;
  const payloads = await Promise.all(
    selected.map(async (file) => ({
      name: file.name,
      path: file.webkitRelativePath || file.name,
      text: await file.text()
    }))
  );
  const combined = payloads.map((item) => `\n--- FILE: ${item.path} ---\n${item.text}`).join("\n");
  els.importInput.value = combined.slice(0, 40000);
  analyzePayloads(payloads, {
    sourceName: options.sourceType === "folder" ? "IG 匯出資料夾" : payloads.map((item) => item.name).join(", "),
    totalFiles: files.length
  });
}

function analyzeText(text, sourceName) {
  rawMessages = parseMessages(text, selectedPlatform);
  contacts = buildContacts(rawMessages).map(scoreContact).sort((a, b) => b.priorityScore - a.priorityScore);
  els.fileStatus.textContent = `${sourceName}：解析出 ${rawMessages.length} 則訊息、${contacts.length} 位人脈`;
  renderPreview();
  render();
}

function analyzePayloads(payloads, meta) {
  rawMessages = payloads.flatMap((payload) => parseFilePayload(payload));
  contacts = buildContacts(rawMessages).map(scoreContact).sort((a, b) => b.priorityScore - a.priorityScore);
  const usefulPaths = payloads.slice(0, 5).map((item) => shortPath(item.path)).join("、");
  els.fileStatus.textContent = `${meta.sourceName}：掃描 ${meta.totalFiles} 個檔案，使用 ${payloads.length} 個，解析出 ${rawMessages.length} 則訊息、${contacts.length} 位人脈`;
  renderPreview({ usefulPaths });
  render();
}

function selectUsefulFiles(files) {
  const allowed = /\.(json|txt|html?|csv)$/i;
  const usefulPath = /(messages|inbox|message_requests|connections|followers|following|personal_information|contacts|profile|comments|likes|recently_viewed)/i;
  const ignorePath = /(media|photos|videos|stickers|ads_information|advertisers|security_and_login|logged_information|preferences|apps_and_websites|autofill|settings|monetization)/i;
  return files
    .filter((file) => allowed.test(file.name))
    .map((file) => ({ file, path: (file.webkitRelativePath || file.name).replaceAll("\\", "/") }))
    .filter(({ path }) => usefulPath.test(path) && !ignorePath.test(path))
    .slice(0, 260)
    .map(({ file }) => file);
}

function parseFilePayload(payload) {
  const path = (payload.path || payload.name || "").replaceAll("\\", "/");
  const text = payload.text || "";
  if (/connections\/followers|followers_and_following|following|followers/i.test(path)) return parseInstagramConnections(text, path);
  if (/personal_information|profile_information|account_information/i.test(path)) return parseInstagramProfileInfo(text, path);
  if (/messages|inbox|message_requests/i.test(path)) return parseInstagramMessages(text, path);
  return parseMessages(text, selectedPlatform);
}

function parseMessages(text, platform) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if ((platform === "auto" || platform === "telegram") && looksLikeJson(trimmed)) return parseTelegramJson(trimmed);
  if ((platform === "auto" || platform === "telegram") && /<html|<div|from_name|text/i.test(trimmed)) return parseHtmlText(trimmed, "Telegram");
  if (platform === "line" || /\d{4}\/\d{1,2}\/\d{1,2}.*\t/.test(trimmed)) return parseLineText(trimmed);
  return parseGenericChat(trimmed, platform === "social" ? "Social" : "Chat");
}

function parseTelegramJson(text) {
  try {
    const data = JSON.parse(text);
    const messages = Array.isArray(data.messages) ? data.messages : Array.isArray(data) ? data : [];
    return messages
      .filter((item) => item && item.type !== "service")
      .map((item) => ({
        platform: "Telegram",
        sender: normalizeSender(item.from || item.from_id || item.actor || "Unknown"),
        date: parseDate(item.date || item.date_unixtime),
        text: normalizeMessageText(item.text || item.text_entities || item.action || "")
      }))
      .filter((item) => item.sender && item.text);
  } catch {
    return parseGenericChat(text, "Telegram");
  }
}

function parseInstagramMessages(text, path) {
  if (!looksLikeJson(text)) return parseMessages(text, "Instagram");
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data.flatMap((item) => parseInstagramThread(item, path));
    }
    if (Array.isArray(data.messages) || Array.isArray(data.participants)) {
      return parseInstagramThread(data, path);
    }
    if (data.inbox && typeof data.inbox === "object") {
      return Object.values(data.inbox).flatMap((item) => parseInstagramThread(item, path));
    }
    return [];
  } catch {
    return parseMessages(text, "Instagram");
  }
}

function parseInstagramThread(thread, path) {
  const participants = (thread.participants || [])
    .map((item) => normalizeSender(item.name || item.username || item))
    .filter(Boolean);
  const fallbackSender = senderFromPath(path);
  return (thread.messages || [])
    .map((message) => {
      const sender = normalizeSender(message.sender_name || message.sender || fallbackSender);
      return {
        platform: "Instagram",
        sender,
        date: parseMetaTimestamp(message.timestamp_ms || message.timestamp || message.created_at),
        text: normalizeMessageText(message.content || message.text || message.share?.link || message.photos?.[0]?.uri || "")
      };
    })
    .filter((item) => item.sender && item.text)
    .map((item) => ({
      ...item,
      sender: item.sender === "Unknown" && participants[0] ? participants[0] : item.sender
    }));
}

function parseInstagramConnections(text, path) {
  const label = /following/i.test(path) ? "Following" : /followers/i.test(path) ? "Follower" : "Instagram Connection";
  if (!looksLikeJson(text)) return parseDelimitedConnections(text, label);
  try {
    const data = JSON.parse(text);
    const rows = flattenConnectionRows(data);
    return rows
      .map((row) => {
        const name = normalizeSender(row.title || row.name || row.username || row.href || row.value || "Instagram Contact");
        const date = parseMetaTimestamp(row.timestamp || row.timestamp_ms || row.date);
        return {
          platform: "Instagram",
          sender: name,
          date,
          text: `${label} ${row.href || row.value || name}`
        };
      })
      .filter((item) => item.sender);
  } catch {
    return parseDelimitedConnections(text, label);
  }
}

function parseInstagramProfileInfo(text, path) {
  if (!looksLikeJson(text)) return [];
  try {
    const data = JSON.parse(text);
    const values = [];
    collectStrings(data, values);
    return values
      .filter((value) => /@|instagram|telegram|line|linkedin|http|email|mail/i.test(value))
      .slice(0, 30)
      .map((value, index) => ({
        platform: "Instagram",
        sender: `Profile Signal ${index + 1}`,
        date: now,
        text: `Profile information signal from ${shortPath(path)}: ${value}`
      }));
  } catch {
    return [];
  }
}

function parseDelimitedConnections(text, label) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 500)
    .map((line) => ({
      platform: "Instagram",
      sender: normalizeSender(line.split(/,|\t/)[0] || line),
      date: now,
      text: `${label} ${line}`
    }));
}

function flattenConnectionRows(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenConnectionRows);
  if (typeof value !== "object") return [];
  const rows = [];
  if (value.title || value.name || value.username || value.href || value.value) rows.push(value);
  Object.values(value).forEach((child) => {
    if (Array.isArray(child) || (child && typeof child === "object")) rows.push(...flattenConnectionRows(child));
  });
  return rows;
}

function collectStrings(value, bucket) {
  if (!value || bucket.length > 120) return;
  if (typeof value === "string") {
    bucket.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, bucket));
    return;
  }
  if (typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, bucket));
}

function parseLineText(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  let currentDate = "";
  for (const line of lines) {
    const dateOnly = line.match(/^(\d{4}\/\d{1,2}\/\d{1,2})/);
    if (dateOnly) currentDate = dateOnly[1];
    const match = line.match(/^(?:(\d{4}\/\d{1,2}\/\d{1,2})\s+)?(\d{1,2}:\d{2})\t([^\t]+)\t(.+)$/);
    if (!match) continue;
    messages.push({
      platform: "LINE",
      sender: normalizeSender(match[3]),
      date: parseDate(`${match[1] || currentDate} ${match[2]}`),
      text: match[4]
    });
  }
  return messages;
}

function parseHtmlText(text, platform) {
  const plain = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|span)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  return parseGenericChat(plain, platform);
}

function parseGenericChat(text, platform) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match =
        line.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2})?)\s+([^:：]+)[:：]\s*(.+)$/) ||
        line.match(/^\[?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4},?\s+\d{1,2}:\d{2}(?:\s?[AP]M)?)\]?\s*([^:：]+)[:：]\s*(.+)$/i) ||
        line.match(/^([^:：]{2,40})[:：]\s*(.+)$/);
      if (!match) return null;
      const hasDate = match.length === 4;
      return {
        platform,
        sender: normalizeSender(hasDate ? match[2] : match[1]),
        date: hasDate ? parseDate(match[1]) : now,
        text: hasDate ? match[3] : match[2]
      };
    })
    .filter(Boolean)
    .filter((item) => item.sender.toLowerCase() !== "me" && item.sender !== "我");
}

function buildContacts(messages) {
  const grouped = new Map();
  messages.forEach((message) => {
    if (!grouped.has(message.sender)) {
      grouped.set(message.sender, {
        id: message.sender,
        name: message.sender,
        platform: message.platform,
        messages: [],
        firstSeen: message.date,
        lastSeen: message.date
      });
    }
    const contact = grouped.get(message.sender);
    contact.messages.push(message);
    contact.lastSeen = message.date > contact.lastSeen ? message.date : contact.lastSeen;
    contact.firstSeen = message.date < contact.firstSeen ? message.date : contact.firstSeen;
  });
  return Array.from(grouped.values()).filter((contact) => contact.messages.length > 0);
}

function scoreContact(contact) {
  const allText = contact.messages.map((message) => message.text).join(" ");
  const lower = allText.toLowerCase();
  const lastContactDays = Math.max(0, Math.round((now - contact.lastSeen) / DAY_MS));
  const messageCount = contact.messages.length;
  const businessHits = countMatches(lower, ["合作", "campaign", "listing", "上幣", "bd", "ama", "referral", "客戶", "交易所", "cex", "liquidity", "market maker", "投資人", "商會", "顧問", "budget"]);
  const urgencyHits = countMatches(lower, ["this week", "這週", "下週", "最近", "updated", "回升", "熱", "找", "需要", "可以"]);
  const valueScore = Math.min(100, 42 + businessHits * 12 + messageCount * 4);
  const interactionScore = Math.min(100, 34 + messageCount * 12 + urgencyHits * 7 - Math.max(0, lastContactDays - 30) * 0.22);
  const rising = interactionScore >= 70 && lastContactDays <= 45;
  const dormant = lastContactDays >= 90;
  const risk = valueScore >= 70 && lastContactDays >= 75;
  const freshness = Math.max(0, 100 - lastContactDays);
  const healthScore = Math.round(interactionScore * 0.46 + freshness * 0.34 + valueScore * 0.2);
  const priorityScore = Math.round(valueScore * 0.45 + Math.min(100, lastContactDays / 1.8) * 0.28 + interactionScore * 0.22 + (rising ? 8 : 0));
  const tags = inferTags(lower, contact.platform);

  return {
    ...contact,
    role: inferRole(lower),
    tags,
    lastContactDays,
    interactionScore: Math.round(interactionScore),
    valueScore: Math.round(valueScore),
    rising,
    dormant,
    risk,
    healthScore: clamp(Math.round(healthScore), 0, 100),
    priorityScore: clamp(Math.round(priorityScore), 0, 100),
    segment: getSegment({ valueScore, rising, dormant, risk }),
    note: contact.messages.at(-1)?.text || "",
    recommendation: getRecommendation(contact, { rising, dormant, risk, valueScore, tags })
  };
}

function inferRole(text) {
  if (/kol|influencer|短影音|ig|youtube/i.test(text)) return "KOL / Creator";
  if (/market maker|liquidity|流動性/i.test(text)) return "Market Maker";
  if (/交易所|cex|listing|上幣|bd/i.test(text)) return "交易所 / BD";
  if (/商會|投資人|fund|vc/i.test(text)) return "投資人節點";
  if (/顧問|compliance|法遵|律師/i.test(text)) return "顧問 / 專家";
  if (/客戶|agent|高淨值|referral/i.test(text)) return "Agent / Referral";
  if (/社群|telegram|tg|ama/i.test(text)) return "社群主";
  return "Crypto Contact";
}

function inferTags(text, platform) {
  const tags = [platform];
  const rules = [
    ["上幣", /listing|上幣|交易所|cex/i],
    ["KOL", /kol|creator|短影音|ig|youtube/i],
    ["AMA", /ama|活動|社群|telegram|tg/i],
    ["Referral", /referral|介紹|客戶|高淨值/i],
    ["Liquidity", /liquidity|market maker|流動性/i],
    ["Compliance", /compliance|法遵|律師|顧問/i],
    ["投資人", /投資人|fund|vc|商會/i],
    ["Campaign", /campaign|launch|聯名|合作/i]
  ];
  rules.forEach(([label, pattern]) => {
    if (pattern.test(text)) tags.push(label);
  });
  return Array.from(new Set(tags)).slice(0, 6);
}

function getSegment(contact) {
  if (contact.risk) return "高價值流失風險";
  if (contact.rising) return "活躍上升";
  if (contact.dormant) return "沉睡關係";
  if (contact.valueScore >= 80) return "高價值人脈";
  return "一般維護";
}

function getRecommendation(contact, flags) {
  const primary = flags.tags?.[1] || "合作";
  if (flags.risk) return `48 小時內聯絡，先用「最近剛好在整理 ${primary} 資源，想到你可能用得上」恢復互動。`;
  if (flags.rising) return "近期互動熱度高，這週適合約 15 分鐘 quick sync，推進 AMA、聯名活動或 referral。";
  if (flags.dormant) return "超過 90 天未互動，先用市場情報或近況關心重新連線，不要一開始就硬推合作。";
  if (flags.valueScore >= 80) return "價值分數高，放進月度維護名單，固定分享市場情報、活動名額或可交換資源。";
  return "維持輕量互動即可，有明確活動、名單或資源時再主動觸發。";
}

function render() {
  const visible = contacts.filter((contact) => {
    if (activeFilter === "priority") return contact.priorityScore >= 70;
    if (activeFilter === "risk") return contact.risk;
    if (activeFilter === "dormant") return contact.dormant;
    return true;
  });
  renderMetrics();
  renderContacts(visible);
  renderActions();
  renderPlaybook();
}

function renderPreview(extra = {}) {
  els.parsePreview.innerHTML = `
    <strong>解析預覽</strong>
    <span>${rawMessages.length} 則訊息</span>
    <span>${contacts.length} 位人脈</span>
    <span>${contacts.filter((item) => item.platform === "Telegram").length} 位 Telegram</span>
    <span>${contacts.filter((item) => item.platform === "LINE").length} 位 LINE</span>
    <span>${contacts.filter((item) => item.platform === "Instagram").length} 位 Instagram</span>
    ${extra.usefulPaths ? `<small>使用檔案：${escapeHtml(extra.usefulPaths)}</small>` : ""}
  `;
}

function renderMetrics() {
  const total = contacts.length;
  const highValue = contacts.filter((item) => item.valueScore >= 80).length;
  const rising = contacts.filter((item) => item.rising).length;
  const dormant = contacts.filter((item) => item.dormant).length;
  const risk = contacts.filter((item) => item.risk).length;
  const health = total ? Math.round(contacts.reduce((sum, item) => sum + item.healthScore, 0) / total) : 0;
  els.metrics.total.textContent = total;
  els.metrics.highValue.textContent = highValue;
  els.metrics.rising.textContent = rising;
  els.metrics.health.textContent = `${health}%`;
  els.metrics.heroPriority.textContent = Math.min(10, total);
  els.metrics.heroDormant.textContent = dormant;
  els.metrics.heroRisk.textContent = risk;
}

function renderContacts(items) {
  els.contactList.innerHTML = "";
  if (!items.length) {
    els.contactList.innerHTML = '<article class="contact-card"><h3>目前沒有符合條件的人脈</h3><p>換一個篩選，或匯入更多聊天紀錄。</p></article>';
    return;
  }
  items.forEach((contact) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.querySelector(".avatar").textContent = initials(contact.name);
    node.querySelector("h3").textContent = contact.name;
    node.querySelector("small").textContent = `${contact.platform} · ${contact.role} · ${contact.segment}`;
    node.querySelector(".score").textContent = `${contact.priorityScore}%`;
    node.querySelector("p").textContent = contact.note;
    node.querySelector(".tags").innerHTML = [
      ...contact.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`),
      contact.rising ? '<span class="tag hot">活躍上升</span>' : "",
      contact.risk ? '<span class="tag risk">流失風險</span>' : ""
    ].join("");
    node.querySelector(".contact-meta").innerHTML = `
      <span>訊息 ${contact.messages.length} 則</span>
      <span>最後互動 ${contact.lastContactDays} 天前</span>
      <span>互動 ${contact.interactionScore}/100</span>
      <span>價值 ${contact.valueScore}/100</span>
      <span>健康度 ${contact.healthScore}%</span>
    `;
    node.querySelector(".recommendation").textContent = contact.recommendation;
    els.contactList.appendChild(node);
  });
}

function renderActions() {
  els.actionList.innerHTML = contacts
    .slice(0, 10)
    .map((contact, index) => `
      <article class="action-item">
        <strong><span class="action-rank">${index + 1}</span>${escapeHtml(contact.name)}</strong>
        <p>${escapeHtml(contact.recommendation)}</p>
      </article>
    `)
    .join("");
}

function renderPlaybook() {
  const riskCount = contacts.filter((item) => item.risk).length;
  const risingCount = contacts.filter((item) => item.rising).length;
  const dormantCount = contacts.filter((item) => item.dormant).length;
  const highValueCount = contacts.filter((item) => item.valueScore >= 80).length;
  const items = [
    `先處理 ${riskCount} 位高價值流失風險人脈，這類人不要再等自然互動。`,
    `把 ${risingCount} 位活躍上升的人安排成活動、AMA、聯名或 referral 的短期機會。`,
    `${dormantCount} 位超過 90 天未互動，建議每週固定喚醒 5-10 位。`,
    `${highValueCount} 位高價值人脈應進入月度維護名單，避免只在需要時才出現。`
  ];
  els.playbookList.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function openConnectorDialog(name) {
  const copy = {
    Telegram: "需要 Bot Token 或匯出檔流程。若要讀個人私訊，需要使用者自行授權或匯出，不適合偷讀。",
    LINE: "需要 LINE Developers Channel。官方 API 適合官方帳號 webhook，個人聊天建議先用備份檔。",
    Meta: "需要 Meta App、Instagram/Facebook 商業帳號與權限審核。",
    LinkedIn: "需要 LinkedIn OAuth App。私訊與關係資料限制較多，MVP 建議先接匯出檔與 CRM。"
  };
  els.connectorTitle.textContent = `${name} 連接器`;
  els.connectorCopy.textContent = copy[name] || "需要平台 App Key 與 OAuth Callback。";
  els.connectorDialog.showModal();
}

function looksLikeJson(text) {
  return text.startsWith("{") || text.startsWith("[");
}

function normalizeMessageText(value) {
  if (Array.isArray(value)) return value.map((item) => (typeof item === "string" ? item : item.text || "")).join("");
  return String(value || "");
}

function normalizeSender(value) {
  return String(value || "Unknown").replace(/^user/i, "User ").trim();
}

function parseDate(value) {
  if (!value) return now;
  if (/^\d+$/.test(String(value))) return new Date(Number(value) * 1000);
  const normalized = String(value).replace(/\//g, "-");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? now : date;
}

function parseMetaTimestamp(value) {
  if (!value) return now;
  const number = Number(value);
  if (!Number.isNaN(number)) return new Date(number > 9999999999 ? number : number * 1000);
  return parseDate(value);
}

function senderFromPath(path) {
  const parts = String(path || "").split(/[\\/]/).filter(Boolean);
  const inboxIndex = parts.findIndex((part) => /inbox|message_requests/i.test(part));
  const folder = inboxIndex >= 0 ? parts[inboxIndex + 1] : parts.at(-2);
  if (!folder) return "Instagram Contact";
  return normalizeSender(folder.replace(/_\d+$/g, "").replace(/[_-]+/g, " "));
}

function shortPath(path) {
  const parts = String(path || "").split(/[\\/]/).filter(Boolean);
  return parts.slice(-3).join("/");
}

function countMatches(text, terms) {
  return terms.reduce((sum, term) => sum + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

init();
