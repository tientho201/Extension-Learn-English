const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const saveStatus = document.getElementById("saveStatus");

async function loadSettings() {
  const { apiKey, model } = await Storage.getSettings();
  apiKeyInput.value = apiKey;
  modelInput.value = model;
}

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || Storage.DEFAULT_MODEL;
  await Storage.saveSettings({ apiKey, model });
  saveStatus.textContent = "Đã lưu.";
  setTimeout(() => (saveStatus.textContent = ""), 2000);
});

loadSettings();
