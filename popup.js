function $(id) {
  return document.getElementById(id);
}

function setStatus(el, message, kind) {
  el.className = "status" + (kind ? ` ${kind}` : "");
  el.innerHTML = "";
  if (!message) return;

  const textSpan = document.createElement("span");
  textSpan.textContent = message;
  el.appendChild(textSpan);

  if (message.includes("Tùy chọn") || message.includes("Chưa cấu hình")) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "status-link";
    link.textContent = " [Mở Cài Đặt]";
    link.addEventListener("click", () => chrome.runtime.openOptionsPage());
    el.appendChild(link);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let currentUtterance = null;

function speak(text, lang = "en-US") {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = lang || "en-US";
  currentUtterance.onend = () => {
    currentUtterance = null;
  };
  currentUtterance.onerror = () => {
    currentUtterance = null;
  };
  speechSynthesis.speak(currentUtterance);
}

const LANG_TO_BCP47 = {
  en: "en-US",
  vi: "vi-VN",
  ja: "ja-JP",
  ko: "ko-KR",
  "zh-CN": "zh-CN",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  ru: "ru-RU",
};

const POS_LABELS = {
  noun: "Danh từ (noun)",
  verb: "Động từ (verb)",
  adjective: "Tính từ (adjective)",
  adverb: "Trạng từ / Phó từ (adverb)",
  pronoun: "Đại từ (pronoun)",
  preposition: "Giới từ (preposition)",
  conjunction: "Liên từ (conjunction)",
  interjection: "Thán từ (interjection)",
  prefix: "Tiền tố (prefix)",
  suffix: "Hậu tố (suffix)",
  abbreviation: "Từ viết tắt (abbreviation)",
  phrase: "Cụm từ (phrase)",
};

const TAB_ORDER = [
  "translate",
  "pronunciation",
  "phrase",
  "usage",
  "compare",
  "synonyms",
  "word-family",
];

// ---- Tabs & Navigation ----
function switchTab(tabName) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const panel = $(`tab-${tabName}`);
  if (!btn || !panel) return;

  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  panel.classList.add("active");

  // Tự động focus vào ô nhập đầu tiên
  const firstInput = panel.querySelector("input, textarea");
  if (firstInput) {
    firstInput.focus();
    if (typeof firstInput.select === "function") firstInput.select();
  }
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

$("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ---- Global Keyboard Shortcuts ----
document.addEventListener("keydown", (e) => {
  // Alt + 1..7: Chuyển tab nhanh chóng
  if (e.altKey && e.key >= "1" && e.key <= "7") {
    e.preventDefault();
    const index = parseInt(e.key, 10) - 1;
    if (TAB_ORDER[index]) {
      switchTab(TAB_ORDER[index]);
    }
    return;
  }

  // Alt + S: Phát âm kết quả hiện tại
  if (e.altKey && (e.key === "s" || e.key === "S")) {
    e.preventDefault();
    const activePanel = document.querySelector(".tab-panel.active");
    if (!activePanel) return;

    const speakBtn = activePanel.querySelector(
      ".result.visible .speak-source-btn, .result.visible .speak-btn, .result.visible .speak-target-btn"
    );
    if (speakBtn) {
      speakBtn.click();
    }
    return;
  }

  // Escape: Xóa nhanh nội dung trong ô nhập đang focus
  if (e.key === "Escape") {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
      if (activeEl.value) {
        activeEl.value = "";
        activeEl.dispatchEvent(new Event("input"));
      }
    }
  }
});

// ---- Google Translate Tab ----
function renderTranslateResult(data) {
  const el = $("translateResult");
  const targetLangCode = LANG_TO_BCP47[data.targetLang] || "vi-VN";
  const sourceLangCode = LANG_TO_BCP47[data.sourceLang] || "en-US";

  let dictHtml = "";
  if (data.dict && data.dict.length > 0) {
    dictHtml = `
      <div class="dict-box">
        <div class="dict-title">📖 Các nghĩa khác & từ điển</div>
        ${data.dict
          .map(
            (group) => `
          <div class="dict-pos-group">
            <span class="dict-pos-name">${escapeHtml(POS_LABELS[group.pos] || group.pos)}</span>
            ${(group.details || [])
              .slice(0, 6)
              .map(
                (d) => `
              <div class="dict-entry-item">
                <span class="dict-entry-meaning">${escapeHtml(d.meaning)}</span>
                ${
                  d.reverseTranslations && d.reverseTranslations.length > 0
                    ? `<div class="dict-entry-synonyms">Các từ liên quan: ${d.reverseTranslations
                        .slice(0, 4)
                        .map((r) => escapeHtml(r))
                        .join(", ")}</div>`
                    : ""
                }
              </div>`
              )
              .join("")}
          </div>`
          )
          .join("")}
      </div>`;
  }

  const phoneticHtml = data.phonetic
    ? `<div class="translate-phonetic-row">
        <span class="translate-phonetic">/${escapeHtml(data.phonetic)}/</span>
        <button type="button" class="speak-btn speak-btn-sm speak-source-btn" title="Nghe phát âm nguồn (Alt+S)">🔊</button>
      </div>`
    : `<div class="translate-phonetic-row">
        <span class="translate-phonetic" style="color:#6b7280;font-style:normal;">(${escapeHtml(data.sourceText)})</span>
        <button type="button" class="speak-btn speak-btn-sm speak-source-btn" title="Nghe phát âm nguồn (Alt+S)">🔊</button>
      </div>`;

  el.innerHTML = `
    <div class="translate-card-header">
      <div>
        <div class="translated-text">${escapeHtml(data.translatedText)}</div>
        ${phoneticHtml}
      </div>
      <div class="translate-actions">
        <button type="button" class="action-icon-btn speak-target-btn" title="Nghe bản dịch">🔊</button>
        <button type="button" class="action-icon-btn copy-btn" title="Sao chép bản dịch">📋</button>
      </div>
    </div>
    ${dictHtml}
  `;
  el.classList.add("visible");

  const speakSourceBtn = el.querySelector(".speak-source-btn");
  if (speakSourceBtn) {
    speakSourceBtn.addEventListener("click", () => {
      speak(data.sourceText, sourceLangCode);
    });
  }

  const speakTargetBtn = el.querySelector(".speak-target-btn");
  if (speakTargetBtn) {
    speakTargetBtn.addEventListener("click", () => {
      speak(data.translatedText, targetLangCode);
    });
  }

  const copyBtn = el.querySelector(".copy-btn");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(data.translatedText);
      copyBtn.textContent = "✓";
      setTimeout(() => (copyBtn.textContent = "📋"), 1500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  });
}

async function renderTranslateList() {
  const list = $("translateList");
  const translations = await Storage.getTranslations();
  if (translations.length === 0) {
    list.innerHTML = `<li class="empty-hint" style="cursor:default;border:none;background:none;padding:2px 0;">Chưa có bản dịch nào được lưu.</li>`;
    return;
  }
  list.innerHTML = translations
    .map(
      (t, i) => `
      <li data-index="${i}">
        <span class="item-word">${escapeHtml(t.sourceText)}</span>
        <span class="item-sub">➔ ${escapeHtml(t.translatedText)}</span>
        <button type="button" class="delete-btn" title="Xóa bản dịch này">✕</button>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-index]").forEach((li) => {
    li.addEventListener("click", () => {
      const t = translations[Number(li.dataset.index)];
      if (t) {
        renderTranslateResult(t);
        $("translateInput").value = t.sourceText;
        $("translateClearBtn").style.display = "block";
        if (t.sourceLang) $("translateSl").value = t.sourceLang;
        if (t.targetLang) $("translateTl").value = t.targetLang;
      }
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await Storage.deleteTranslation(li.dataset.index);
      await renderTranslateList();
    });
  });
}

// Translate Controls
const translateInput = $("translateInput");
const translateClearBtn = $("translateClearBtn");

translateInput.addEventListener("input", () => {
  translateClearBtn.style.display = translateInput.value ? "block" : "none";
});

translateClearBtn.addEventListener("click", () => {
  translateInput.value = "";
  translateClearBtn.style.display = "none";
  translateInput.focus();
});

// Phím tắt Enter hoặc Ctrl+Enter trong Textarea để dịch ngay
translateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || !e.shiftKey)) {
    e.preventDefault();
    $("translateForm").dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

$("translateSwapBtn").addEventListener("click", () => {
  const sl = $("translateSl");
  const tl = $("translateTl");
  let from = sl.value;
  let to = tl.value;
  if (from === "auto") {
    from = "en";
  }
  sl.value = to;
  tl.value = from;
});

$("translateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = translateInput.value.trim();
  if (!text) return;

  const sl = $("translateSl").value;
  const tl = $("translateTl").value;
  const statusEl = $("translateStatus");
  const submitBtn = $("translateSubmitBtn");

  $("translateResult").classList.remove("visible");
  setStatus(statusEl, "Đang dịch bằng Google Dịch...", "loading");
  submitBtn.disabled = true;

  try {
    const data = await Api.translateGoogle(text, sl, tl);
    renderTranslateResult(data);
    await Storage.addTranslation(data);
    await renderTranslateList();
    setStatus(statusEl, "");
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Pronunciation tab ----
function renderPronunciationResult(data) {
  const el = $("pronunciationResult");
  const confusable = (data.confusable_with || [])
    .map(
      (c) => `<div class="confusable-item">🔁 <strong>${escapeHtml(c.word)}</strong>: ${escapeHtml(c.difference)}</div>`
    )
    .join("");

  el.innerHTML = `
    <h3>
      ${escapeHtml(data.word)}
      <span class="ipa">${escapeHtml(data.ipa)}</span>
      <button type="button" class="speak-btn" title="Nghe phát âm (Alt+S)">🔊</button>
    </h3>
    <p>${escapeHtml(data.description)}</p>
    ${
      confusable
        ? `<div class="confusable">${confusable}</div>`
        : `<div class="confusable empty-hint">Không có từ nào trong danh sách dễ gây nhầm lẫn.</div>`
    }
  `;
  el.classList.add("visible");
  el.querySelector(".speak-btn").addEventListener("click", () => speak(data.word, "en-US"));
}

async function renderWordList() {
  const words = await Storage.getWords();
  const list = $("wordList");
  if (words.length === 0) {
    list.innerHTML = `<li class="empty-hint" style="cursor:default;border:none;background:none;padding:2px 0;">Chưa có từ nào được lưu.</li>`;
    return;
  }
  list.innerHTML = words
    .map(
      (w) => `
      <li data-word="${escapeHtml(w.word)}">
        <span class="item-word">${escapeHtml(w.word)}</span>
        <span class="item-sub">${escapeHtml(w.ipa)}</span>
        <button type="button" class="speak-btn speak-btn-sm" title="Nghe phát âm">🔊</button>
        <button type="button" class="delete-btn" title="Xóa từ này">✕</button>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-word]").forEach((li) => {
    li.addEventListener("click", () => {
      const w = words.find((x) => (x.word || "").toLowerCase() === li.dataset.word.toLowerCase());
      if (w) renderPronunciationResult(w);
    });
    li.querySelector(".speak-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      speak(li.dataset.word, "en-US");
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await Storage.deleteWord(li.dataset.word);
      await renderWordList();
    });
  });
}

$("pronunciationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("newWordInput");
  const word = input.value.trim();
  if (!word) return;

  const statusEl = $("pronunciationStatus");
  const submitBtn = e.target.querySelector("button");
  $("pronunciationResult").classList.remove("visible");
  setStatus(statusEl, "Đang tra cứu...", "loading");
  submitBtn.disabled = true;

  try {
    const existingWords = (await Storage.getWords()).map((w) => w.word);
    const data = await Api.getPronunciation(word, existingWords);
    renderPronunciationResult(data);
    await Storage.addWord(data);
    await renderWordList();
    setStatus(statusEl, "");
    input.value = "";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Phrase meaning tab ----
function renderPhraseResult(data) {
  const el = $("phraseResult");
  el.innerHTML = `
    <h3>${escapeHtml(data.phrase)}</h3>
    <p><strong>Nghĩa:</strong> ${escapeHtml(data.meaning)}</p>
    <p><strong>Nghĩa đen từng từ:</strong> ${escapeHtml(data.literal_breakdown)}</p>
    <p><strong>Vì sao có nghĩa này:</strong> ${escapeHtml(data.why_this_meaning)}</p>
    ${
      !data.is_confirmed_etymology
        ? `<div class="etymology-note">⚠️ Đây là cách liên tưởng để dễ nhớ, không phải nguồn gốc lịch sử đã được xác nhận.</div>`
        : ""
    }
  `;
  el.classList.add("visible");
}

async function renderPhraseList() {
  const phrases = await Storage.getPhrases();
  const list = $("phraseList");
  if (phrases.length === 0) {
    list.innerHTML = `<li class="empty-hint" style="cursor:default;border:none;background:none;padding:2px 0;">Chưa có cụm từ nào được lưu.</li>`;
    return;
  }
  list.innerHTML = phrases
    .map(
      (p) => `
      <li data-phrase="${escapeHtml(p.phrase)}">
        <span class="item-word">${escapeHtml(p.phrase)}</span>
        <div class="item-sub">${escapeHtml(p.meaning)}</div>
        <button type="button" class="delete-btn" title="Xóa cụm từ này">✕</button>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-phrase]").forEach((li) => {
    li.addEventListener("click", () => {
      const p = phrases.find((x) => (x.phrase || "").toLowerCase() === li.dataset.phrase.toLowerCase());
      if (p) renderPhraseResult(p);
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await Storage.deletePhrase(li.dataset.phrase);
      await renderPhraseList();
    });
  });
}

$("phraseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("phraseInput");
  const phrase = input.value.trim();
  if (!phrase) return;

  const statusEl = $("phraseStatus");
  const submitBtn = e.target.querySelector("button");
  $("phraseResult").classList.remove("visible");
  setStatus(statusEl, "Đang tra cứu...", "loading");
  submitBtn.disabled = true;

  try {
    const data = await Api.getPhraseMeaning(phrase);
    renderPhraseResult(data);
    await Storage.addPhrase(data);
    await renderPhraseList();
    setStatus(statusEl, "");
    input.value = "";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Word usage tab ----
function renderUsageResult(data) {
  const el = $("usageResult");
  const contexts = (data.usage_contexts || [])
    .map(
      (c) => `
      <div class="confusable-item">
        <strong>${escapeHtml(c.context)}</strong><br/>
        <em>${escapeHtml(c.example)}</em>
      </div>`
    )
    .join("");

  el.innerHTML = `
    <h3>
      ${escapeHtml(data.word)}
      <button type="button" class="speak-btn" title="Nghe phát âm (Alt+S)">🔊</button>
    </h3>
    <p>${escapeHtml(data.meaning)}</p>
    ${contexts ? `<div class="confusable">${contexts}</div>` : ""}
    ${data.notes ? `<div class="etymology-note">${escapeHtml(data.notes)}</div>` : ""}
  `;
  el.classList.add("visible");
  el.querySelector(".speak-btn").addEventListener("click", () => speak(data.word, "en-US"));
}

async function renderUsageList() {
  const usages = await Storage.getUsages();
  const list = $("usageList");
  if (usages.length === 0) {
    list.innerHTML = `<li class="empty-hint" style="cursor:default;border:none;background:none;padding:2px 0;">Chưa có từ nào được lưu.</li>`;
    return;
  }
  list.innerHTML = usages
    .map(
      (u) => `
      <li data-word="${escapeHtml(u.word)}">
        <span class="item-word">${escapeHtml(u.word)}</span>
        <span class="item-sub">${escapeHtml(u.meaning)}</span>
        <button type="button" class="delete-btn" title="Xóa mục này">✕</button>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-word]").forEach((li) => {
    li.addEventListener("click", () => {
      const u = usages.find((x) => (x.word || "").toLowerCase() === li.dataset.word.toLowerCase());
      if (u) renderUsageResult(u);
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await Storage.deleteUsage(li.dataset.word);
      await renderUsageList();
    });
  });
}

$("usageForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("usageWordInput");
  const word = input.value.trim();
  if (!word) return;

  const statusEl = $("usageStatus");
  const submitBtn = e.target.querySelector("button");
  $("usageResult").classList.remove("visible");
  setStatus(statusEl, "Đang tra cứu...", "loading");
  submitBtn.disabled = true;

  try {
    const data = await Api.getWordUsage(word);
    renderUsageResult(data);
    await Storage.addUsage(data);
    await renderUsageList();
    setStatus(statusEl, "");
    input.value = "";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Word comparison tab ----
function renderCompareResult(data) {
  const el = $("compareResult");
  const differences = (data.differences || [])
    .map(
      (d) => `<div class="confusable-item">🔀 <strong>${escapeHtml(d.aspect)}</strong>: ${escapeHtml(d.explanation)}</div>`
    )
    .join("");

  el.innerHTML = `
    <h3>
      ${escapeHtml(data.word_a)}
      <button type="button" class="speak-btn" data-word="${escapeHtml(data.word_a)}" title="Nghe ${escapeHtml(data.word_a)}">🔊</button>
      <span style="color:#9ca3af;font-weight:400;">vs</span>
      ${escapeHtml(data.word_b)}
      <button type="button" class="speak-btn" data-word="${escapeHtml(data.word_b)}" title="Nghe ${escapeHtml(data.word_b)}">🔊</button>
    </h3>
    <p><strong>Nghĩa chung:</strong> ${escapeHtml(data.shared_meaning)}</p>
    ${differences ? `<div class="confusable">${differences}</div>` : ""}
    <p><strong>Khi nào dùng "${escapeHtml(data.word_a)}":</strong> ${escapeHtml(data.when_to_use_a)}<br/><em>${escapeHtml(data.example_a)}</em></p>
    <p><strong>Khi nào dùng "${escapeHtml(data.word_b)}":</strong> ${escapeHtml(data.when_to_use_b)}<br/><em>${escapeHtml(data.example_b)}</em></p>
  `;
  el.classList.add("visible");
  el.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.addEventListener("click", () => speak(btn.dataset.word, "en-US"));
  });
}

async function renderCompareList() {
  const comparisons = await Storage.getComparisons();
  const list = $("compareList");
  if (comparisons.length === 0) {
    list.innerHTML = `<li class="empty-hint" style="cursor:default;border:none;background:none;padding:2px 0;">Chưa có so sánh nào được lưu.</li>`;
    return;
  }
  list.innerHTML = comparisons
    .map(
      (c, i) => `
      <li data-index="${i}">
        <span class="item-word">${escapeHtml(c.word_a)} vs ${escapeHtml(c.word_b)}</span>
        <button type="button" class="delete-btn" title="Xóa so sánh này">✕</button>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-index]").forEach((li) => {
    li.addEventListener("click", () => {
      const c = comparisons[Number(li.dataset.index)];
      if (c) renderCompareResult(c);
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await Storage.deleteComparison(li.dataset.index);
      await renderCompareList();
    });
  });
}

$("compareForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const inputA = $("compareWordAInput");
  const inputB = $("compareWordBInput");
  const wordA = inputA.value.trim();
  const wordB = inputB.value.trim();
  if (!wordA || !wordB) return;

  const statusEl = $("compareStatus");
  const submitBtn = e.target.querySelector("button");
  $("compareResult").classList.remove("visible");
  setStatus(statusEl, "Đang so sánh...", "loading");
  submitBtn.disabled = true;

  try {
    const data = await Api.getWordComparison(wordA, wordB);
    renderCompareResult(data);
    await Storage.addComparison(data);
    await renderCompareList();
    setStatus(statusEl, "");
    inputA.value = "";
    inputB.value = "";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Synonyms tab ----
function renderSynonymsResult(data) {
  const el = $("synonymsResult");
  const synonyms = (data.synonyms || [])
    .map(
      (s) => `
      <div class="synonym-item">
        <div class="synonym-head">
          ${escapeHtml(s.word)}
          <span class="word-type-tag">${escapeHtml(s.word_type)}</span>
          <span class="ipa">${escapeHtml(s.ipa)}</span>
          <button type="button" class="speak-btn speak-btn-sm" data-word="${escapeHtml(s.word)}" title="Nghe ${escapeHtml(s.word)}">🔊</button>
        </div>
        <p>${escapeHtml(s.usage)}</p>
        ${s.example ? `<p><em>${escapeHtml(s.example)}</em></p>` : ""}
      </div>`
    )
    .join("");

  el.innerHTML = `
    <h3>
      ${escapeHtml(data.word)}
      <span class="word-type-tag">${escapeHtml(data.word_type)}</span>
      <button type="button" class="speak-btn" title="Nghe phát âm (Alt+S)">🔊</button>
    </h3>
    ${synonyms || `<div class="empty-hint">Không tìm được từ đồng nghĩa phù hợp.</div>`}
  `;
  el.classList.add("visible");
  el.querySelectorAll(".speak-btn[data-word]").forEach((btn) => {
    btn.addEventListener("click", () => speak(btn.dataset.word, "en-US"));
  });
  el.querySelector("h3 .speak-btn:not([data-word])").addEventListener("click", () => speak(data.word, "en-US"));
}

async function renderSynonymsList() {
  const entries = await Storage.getSynonymEntries();
  const list = $("synonymsList");
  if (entries.length === 0) {
    list.innerHTML = `<li class="empty-hint" style="cursor:default;border:none;background:none;padding:2px 0;">Chưa có từ nào được lưu.</li>`;
    return;
  }
  list.innerHTML = entries
    .map(
      (e) => `
      <li data-word="${escapeHtml(e.word)}">
        <span class="item-word">${escapeHtml(e.word)}</span>
        <span class="item-sub">${(e.synonyms || []).map((s) => escapeHtml(s.word)).join(", ")}</span>
        <button type="button" class="delete-btn" title="Xóa mục này">✕</button>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-word]").forEach((li) => {
    li.addEventListener("click", () => {
      const e = entries.find((x) => (x.word || "").toLowerCase() === li.dataset.word.toLowerCase());
      if (e) renderSynonymsResult(e);
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await Storage.deleteSynonymEntry(li.dataset.word);
      await renderSynonymsList();
    });
  });
}

$("synonymsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("synonymsWordInput");
  const word = input.value.trim();
  if (!word) return;

  const statusEl = $("synonymsStatus");
  const submitBtn = e.target.querySelector("button");
  $("synonymsResult").classList.remove("visible");
  setStatus(statusEl, "Đang tìm từ đồng nghĩa...", "loading");
  submitBtn.disabled = true;

  try {
    const data = await Api.getSynonyms(word);
    renderSynonymsResult(data);
    await Storage.addSynonymEntry(data);
    await renderSynonymsList();
    setStatus(statusEl, "");
    input.value = "";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Word Family Tab ----
function renderWordFamilyResult(data) {
  const el = $("wordFamilyResult");
  const family = data.word_family || {};
  const categories = [
    { key: "nouns", label: "Danh từ (Nouns)", badgeClass: "wf-badge-noun" },
    { key: "verbs", label: "Động từ (Verbs)", badgeClass: "wf-badge-verb" },
    { key: "adjectives", label: "Tính từ (Adjectives)", badgeClass: "wf-badge-adj" },
    { key: "adverbs", label: "Trạng từ (Adverbs)", badgeClass: "wf-badge-adv" },
  ];

  let sectionsHtml = "";
  for (const cat of categories) {
    const items = family[cat.key] || [];
    if (items.length > 0) {
      sectionsHtml += `
        <div class="wf-section">
          <div class="wf-section-title">
            <span class="${cat.badgeClass}">${cat.label}</span>
          </div>
          ${items
            .map(
              (item) => `
            <div class="wf-item">
              <div class="wf-head">
                <span>${escapeHtml(item.word)}</span>
                ${item.ipa ? `<span class="wf-ipa">/${escapeHtml(item.ipa)}/</span>` : ""}
                <button type="button" class="speak-btn speak-btn-sm" data-word="${escapeHtml(item.word)}" title="Nghe phát âm">🔊</button>
              </div>
              <div class="wf-meaning">${escapeHtml(item.meaning)}</div>
              ${item.example ? `<div class="wf-example">${escapeHtml(item.example)}</div>` : ""}
            </div>`
            )
            .join("")}
        </div>`;
    }
  }

  let collocationsHtml = "";
  if (data.collocations && data.collocations.length > 0) {
    collocationsHtml = `
      <div class="collocation-box">
        <div class="collocation-title">🔗 Collocations & Cụm từ thường gặp</div>
        ${data.collocations
          .map(
            (c) => `
          <div class="collocation-item">
            <div class="collocation-phrase">
              ${escapeHtml(c.phrase)}
              <button type="button" class="speak-btn speak-btn-sm" data-word="${escapeHtml(c.phrase)}" title="Nghe">🔊</button>
            </div>
            <div class="wf-meaning">${escapeHtml(c.meaning)}</div>
            ${c.example ? `<div class="wf-example">${escapeHtml(c.example)}</div>` : ""}
          </div>`
          )
          .join("")}
      </div>`;
  }

  const rootDisplay = data.root_word || data.word;
  el.innerHTML = `
    <h3>
      ${escapeHtml(rootDisplay)}
      <button type="button" class="speak-btn" data-word="${escapeHtml(rootDisplay)}" title="Nghe phát âm từ gốc (Alt+S)">🔊</button>
    </h3>
    ${sectionsHtml || `<div class="empty-hint">Không tìm thấy họ từ liên quan.</div>`}
    ${collocationsHtml}
  `;
  el.classList.add("visible");

  el.querySelectorAll(".speak-btn[data-word]").forEach((btn) => {
    btn.addEventListener("click", () => speak(btn.dataset.word, "en-US"));
  });
}

async function renderWordFamilyList() {
  const list = $("wordFamilyList");
  const items = await Storage.getWordFamilies();
  if (items.length === 0) {
    list.innerHTML = `<li class="empty-hint" style="cursor:default;border:none;background:none;padding:2px 0;">Chưa có từ nào được lưu.</li>`;
    return;
  }
  list.innerHTML = items
    .map(
      (item) => `
      <li data-word="${escapeHtml(item.root_word || item.word)}">
        <span class="item-word">${escapeHtml(item.root_word || item.word)}</span>
        <span class="item-sub">${escapeHtml(item.word || "")}</span>
        <button type="button" class="delete-btn" title="Xóa mục này">✕</button>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-word]").forEach((li) => {
    li.addEventListener("click", () => {
      const found = items.find(
        (x) =>
          (x.root_word || x.word || "").toLowerCase() ===
          li.dataset.word.toLowerCase()
      );
      if (found) renderWordFamilyResult(found);
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await Storage.deleteWordFamily(li.dataset.word);
      await renderWordFamilyList();
    });
  });
}

$("wordFamilyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("wordFamilyInput");
  const word = input.value.trim();
  if (!word) return;

  const statusEl = $("wordFamilyStatus");
  const submitBtn = e.target.querySelector("button");
  $("wordFamilyResult").classList.remove("visible");
  setStatus(statusEl, "Đang phân tích Word Family...", "loading");
  submitBtn.disabled = true;

  try {
    const data = await Api.getWordFamily(word);
    renderWordFamilyResult(data);
    await Storage.addWordFamily(data);
    await renderWordFamilyList();
    setStatus(statusEl, "");
    input.value = "";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Init ----
renderTranslateList();
renderWordList();
renderPhraseList();
renderUsageList();
renderCompareList();
renderSynonymsList();
renderWordFamilyList();

// Tự động focus vào ô nhập đầu tiên khi vừa mở popup
const activeFirstInput = document.querySelector(".tab-panel.active input, .tab-panel.active textarea");
if (activeFirstInput) {
  activeFirstInput.focus();
}
