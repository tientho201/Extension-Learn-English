const Storage = {
  DEFAULT_MODEL: "gemini-3.5-flash-lite",

  async getSettings() {
    const { apiKey = "", model = Storage.DEFAULT_MODEL } =
      await chrome.storage.sync.get(["apiKey", "model"]);
    return { apiKey, model };
  },

  async saveSettings({ apiKey, model }) {
    await chrome.storage.sync.set({ apiKey, model });
  },

  async getWords() {
    const { words = [] } = await chrome.storage.local.get(["words"]);
    return words;
  },

  async addWord(entry) {
    const words = await Storage.getWords();
    const filtered = words.filter((w) => w.word !== entry.word);
    filtered.unshift(entry);
    await chrome.storage.local.set({ words: filtered });
    return filtered;
  },

  async getPhrases() {
    const { phrases = [] } = await chrome.storage.local.get(["phrases"]);
    return phrases;
  },

  async addPhrase(entry) {
    const phrases = await Storage.getPhrases();
    const filtered = phrases.filter((p) => p.phrase !== entry.phrase);
    filtered.unshift(entry);
    await chrome.storage.local.set({ phrases: filtered });
    return filtered;
  },

  async getUsages() {
    const { usages = [] } = await chrome.storage.local.get(["usages"]);
    return usages;
  },

  async addUsage(entry) {
    const usages = await Storage.getUsages();
    const filtered = usages.filter((u) => u.word !== entry.word);
    filtered.unshift(entry);
    await chrome.storage.local.set({ usages: filtered });
    return filtered;
  },

  async getComparisons() {
    const { comparisons = [] } = await chrome.storage.local.get(["comparisons"]);
    return comparisons;
  },

  async addComparison(entry) {
    const comparisons = await Storage.getComparisons();
    const key = `${entry.word_a.toLowerCase()}|${entry.word_b.toLowerCase()}`;
    const filtered = comparisons.filter(
      (c) => `${c.word_a.toLowerCase()}|${c.word_b.toLowerCase()}` !== key
    );
    filtered.unshift(entry);
    await chrome.storage.local.set({ comparisons: filtered });
    return filtered;
  },

  async getSynonymEntries() {
    const { synonymEntries = [] } = await chrome.storage.local.get(["synonymEntries"]);
    return synonymEntries;
  },

  async addSynonymEntry(entry) {
    const synonymEntries = await Storage.getSynonymEntries();
    const filtered = synonymEntries.filter((s) => s.word !== entry.word);
    filtered.unshift(entry);
    await chrome.storage.local.set({ synonymEntries: filtered });
    return filtered;
  },
};
