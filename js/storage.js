const Storage = {
  DEFAULT_MODEL: "gemini-3.1-flash-lite",
  DEFAULT_OPENAI_MODEL: "gpt-4o-mini",
  DEFAULT_PROVIDER: "gemini",
  MAX_ITEMS: 50,

  async getSettings() {
    const {
      apiKey = "",
      model = Storage.DEFAULT_MODEL,
      openaiApiKey = "",
      openaiModel = Storage.DEFAULT_OPENAI_MODEL,
      provider = Storage.DEFAULT_PROVIDER,
    } = await chrome.storage.sync.get([
      "apiKey",
      "model",
      "openaiApiKey",
      "openaiModel",
      "provider",
    ]);
    return { apiKey, model, openaiApiKey, openaiModel, provider };
  },

  async saveSettings({ apiKey, model, openaiApiKey, openaiModel, provider }) {
    await chrome.storage.sync.set({
      apiKey,
      model,
      openaiApiKey,
      openaiModel,
      provider,
    });
  },

  async getWords() {
    const { words = [] } = await chrome.storage.local.get(["words"]);
    return words;
  },

  async addWord(entry) {
    const words = await Storage.getWords();
    const entryWord = (entry.word || "").trim().toLowerCase();
    const filtered = words.filter((w) => (w.word || "").trim().toLowerCase() !== entryWord);
    filtered.unshift(entry);
    const sliced = filtered.slice(0, Storage.MAX_ITEMS);
    await chrome.storage.local.set({ words: sliced });
    return sliced;
  },

  async deleteWord(word) {
    const words = await Storage.getWords();
    const target = (word || "").trim().toLowerCase();
    const filtered = words.filter((w) => (w.word || "").trim().toLowerCase() !== target);
    await chrome.storage.local.set({ words: filtered });
    return filtered;
  },

  async getPhrases() {
    const { phrases = [] } = await chrome.storage.local.get(["phrases"]);
    return phrases;
  },

  async addPhrase(entry) {
    const phrases = await Storage.getPhrases();
    const entryPhrase = (entry.phrase || "").trim().toLowerCase();
    const filtered = phrases.filter((p) => (p.phrase || "").trim().toLowerCase() !== entryPhrase);
    filtered.unshift(entry);
    const sliced = filtered.slice(0, Storage.MAX_ITEMS);
    await chrome.storage.local.set({ phrases: sliced });
    return sliced;
  },

  async deletePhrase(phrase) {
    const phrases = await Storage.getPhrases();
    const target = (phrase || "").trim().toLowerCase();
    const filtered = phrases.filter((p) => (p.phrase || "").trim().toLowerCase() !== target);
    await chrome.storage.local.set({ phrases: filtered });
    return filtered;
  },

  async getUsages() {
    const { usages = [] } = await chrome.storage.local.get(["usages"]);
    return usages;
  },

  async addUsage(entry) {
    const usages = await Storage.getUsages();
    const entryWord = (entry.word || "").trim().toLowerCase();
    const filtered = usages.filter((u) => (u.word || "").trim().toLowerCase() !== entryWord);
    filtered.unshift(entry);
    const sliced = filtered.slice(0, Storage.MAX_ITEMS);
    await chrome.storage.local.set({ usages: sliced });
    return sliced;
  },

  async deleteUsage(word) {
    const usages = await Storage.getUsages();
    const target = (word || "").trim().toLowerCase();
    const filtered = usages.filter((u) => (u.word || "").trim().toLowerCase() !== target);
    await chrome.storage.local.set({ usages: filtered });
    return filtered;
  },

  async getComparisons() {
    const { comparisons = [] } = await chrome.storage.local.get(["comparisons"]);
    return comparisons;
  },

  async addComparison(entry) {
    const comparisons = await Storage.getComparisons();
    const wordA = (entry.word_a || "").trim().toLowerCase();
    const wordB = (entry.word_b || "").trim().toLowerCase();
    const key = `${wordA}|${wordB}`;
    const keyReverse = `${wordB}|${wordA}`;

    const filtered = comparisons.filter((c) => {
      const cA = (c.word_a || "").trim().toLowerCase();
      const cB = (c.word_b || "").trim().toLowerCase();
      const cKey = `${cA}|${cB}`;
      return cKey !== key && cKey !== keyReverse;
    });

    filtered.unshift(entry);
    const sliced = filtered.slice(0, Storage.MAX_ITEMS);
    await chrome.storage.local.set({ comparisons: sliced });
    return sliced;
  },

  async deleteComparison(index) {
    const comparisons = await Storage.getComparisons();
    const targetIndex = Number(index);
    const filtered = comparisons.filter((_, i) => i !== targetIndex);
    await chrome.storage.local.set({ comparisons: filtered });
    return filtered;
  },

  async getSynonymEntries() {
    const { synonymEntries = [] } = await chrome.storage.local.get(["synonymEntries"]);
    return synonymEntries;
  },

  async addSynonymEntry(entry) {
    const synonymEntries = await Storage.getSynonymEntries();
    const entryWord = (entry.word || "").trim().toLowerCase();
    const filtered = synonymEntries.filter((s) => (s.word || "").trim().toLowerCase() !== entryWord);
    filtered.unshift(entry);
    const sliced = filtered.slice(0, Storage.MAX_ITEMS);
    await chrome.storage.local.set({ synonymEntries: sliced });
    return sliced;
  },

  async deleteSynonymEntry(word) {
    const synonymEntries = await Storage.getSynonymEntries();
    const target = (word || "").trim().toLowerCase();
    const filtered = synonymEntries.filter((s) => (s.word || "").trim().toLowerCase() !== target);
    await chrome.storage.local.set({ synonymEntries: filtered });
    return filtered;
  },

  async getTranslations() {
    const { translations = [] } = await chrome.storage.local.get(["translations"]);
    return translations;
  },

  async addTranslation(entry) {
    const translations = await Storage.getTranslations();
    const sourceKey = (entry.sourceText || "").trim().toLowerCase();
    const targetLang = entry.targetLang || "";
    const filtered = translations.filter(
      (t) =>
        (t.sourceText || "").trim().toLowerCase() !== sourceKey ||
        t.targetLang !== targetLang
    );
    filtered.unshift(entry);
    const sliced = filtered.slice(0, Storage.MAX_ITEMS);
    await chrome.storage.local.set({ translations: sliced });
    return sliced;
  },

  async deleteTranslation(index) {
    const translations = await Storage.getTranslations();
    const targetIndex = Number(index);
    const filtered = translations.filter((_, i) => i !== targetIndex);
    await chrome.storage.local.set({ translations: filtered });
    return filtered;
  },

  async getWordFamilies() {
    const { wordFamilies = [] } = await chrome.storage.local.get(["wordFamilies"]);
    return wordFamilies;
  },

  async addWordFamily(entry) {
    const wordFamilies = await Storage.getWordFamilies();
    const entryWord = (entry.word || entry.root_word || "").trim().toLowerCase();
    const filtered = wordFamilies.filter(
      (wf) => (wf.word || wf.root_word || "").trim().toLowerCase() !== entryWord
    );
    filtered.unshift(entry);
    const sliced = filtered.slice(0, Storage.MAX_ITEMS);
    await chrome.storage.local.set({ wordFamilies: sliced });
    return sliced;
  },

  async deleteWordFamily(word) {
    const wordFamilies = await Storage.getWordFamilies();
    const target = (word || "").trim().toLowerCase();
    const filtered = wordFamilies.filter(
      (wf) => (wf.word || wf.root_word || "").trim().toLowerCase() !== target
    );
    await chrome.storage.local.set({ wordFamilies: filtered });
    return filtered;
  },
};
