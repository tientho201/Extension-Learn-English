function $(id) {
  return document.getElementById(id);
}

function setStatus(el, message, kind) {
  el.textContent = message || "";
  el.className = "status" + (kind ? ` ${kind}` : "");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

$("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
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
      <button type="button" class="speak-btn" title="Nghe phát âm">🔊</button>
    </h3>
    <p>${escapeHtml(data.description)}</p>
    ${
      confusable
        ? `<div class="confusable">${confusable}</div>`
        : `<div class="confusable empty-hint">Không có từ nào trong danh sách dễ gây nhầm lẫn.</div>`
    }
  `;
  el.classList.add("visible");
  el.querySelector(".speak-btn").addEventListener("click", () => speak(data.word));
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
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-word]").forEach((li) => {
    li.addEventListener("click", () => {
      const w = words.find((x) => x.word === li.dataset.word);
      if (w) renderPronunciationResult(w);
    });
    li.querySelector(".speak-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      speak(li.dataset.word);
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
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-phrase]").forEach((li) => {
    li.addEventListener("click", () => {
      const p = phrases.find((x) => x.phrase === li.dataset.phrase);
      if (p) renderPhraseResult(p);
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
      <button type="button" class="speak-btn" title="Nghe phát âm">🔊</button>
    </h3>
    <p>${escapeHtml(data.meaning)}</p>
    ${contexts ? `<div class="confusable">${contexts}</div>` : ""}
    ${data.notes ? `<div class="etymology-note">${escapeHtml(data.notes)}</div>` : ""}
  `;
  el.classList.add("visible");
  el.querySelector(".speak-btn").addEventListener("click", () => speak(data.word));
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
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-word]").forEach((li) => {
    li.addEventListener("click", () => {
      const u = usages.find((x) => x.word === li.dataset.word);
      if (u) renderUsageResult(u);
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
    btn.addEventListener("click", () => speak(btn.dataset.word));
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
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-index]").forEach((li) => {
    li.addEventListener("click", () => {
      const c = comparisons[Number(li.dataset.index)];
      if (c) renderCompareResult(c);
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
      <button type="button" class="speak-btn" title="Nghe phát âm">🔊</button>
    </h3>
    ${synonyms || `<div class="empty-hint">Không tìm được từ đồng nghĩa phù hợp.</div>`}
  `;
  el.classList.add("visible");
  el.querySelectorAll(".speak-btn[data-word]").forEach((btn) => {
    btn.addEventListener("click", () => speak(btn.dataset.word));
  });
  el.querySelector("h3 .speak-btn:not([data-word])").addEventListener("click", () => speak(data.word));
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
        <span class="item-sub">${(e.synonyms || []).map((s) => s.word).join(", ")}</span>
      </li>`
    )
    .join("");

  list.querySelectorAll("li[data-word]").forEach((li) => {
    li.addEventListener("click", () => {
      const e = entries.find((x) => x.word === li.dataset.word);
      if (e) renderSynonymsResult(e);
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

// ---- Init ----
renderWordList();
renderPhraseList();
renderUsageList();
renderCompareList();
renderSynonymsList();
