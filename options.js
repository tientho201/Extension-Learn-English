const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const openaiApiKeyInput = document.getElementById("openaiApiKey");
const openaiModelInput = document.getElementById("openaiModel");
const useOpenAiCheckbox = document.getElementById("useOpenAiCheckbox");
const activeProviderBadge = document.getElementById("activeProviderBadge");

const testGeminiBtn = document.getElementById("testGeminiBtn");
const geminiTestStatus = document.getElementById("geminiTestStatus");
const testOpenaiBtn = document.getElementById("testOpenaiBtn");
const openaiTestStatus = document.getElementById("openaiTestStatus");

const saveStatus = document.getElementById("saveStatus");

function updateBadge() {
  if (useOpenAiCheckbox.checked) {
    activeProviderBadge.textContent = "Đang dùng: 🤖 OpenAI (ChatGPT)";
    activeProviderBadge.style.background = "#f0fdf4";
    activeProviderBadge.style.color = "#15803d";
  } else {
    activeProviderBadge.textContent = "Đang dùng: ♊ Google Gemini";
    activeProviderBadge.style.background = "#eff6ff";
    activeProviderBadge.style.color = "#1d4ed8";
  }
}

useOpenAiCheckbox.addEventListener("change", updateBadge);

async function loadSettings() {
  const { apiKey, model, openaiApiKey, openaiModel, provider } = await Storage.getSettings();
  apiKeyInput.value = apiKey || "";
  modelInput.value = model || "";
  openaiApiKeyInput.value = openaiApiKey || "";
  openaiModelInput.value = openaiModel || "";
  useOpenAiCheckbox.checked = provider === "openai";
  updateBadge();
}

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || Storage.DEFAULT_MODEL;
  const openaiApiKey = openaiApiKeyInput.value.trim();
  const openaiModel = openaiModelInput.value.trim() || Storage.DEFAULT_OPENAI_MODEL;
  const provider = useOpenAiCheckbox.checked ? "openai" : "gemini";

  await Storage.saveSettings({
    apiKey,
    model,
    openaiApiKey,
    openaiModel,
    provider,
  });

  saveStatus.textContent = "✅ Đã lưu cài đặt thành công!";
  setTimeout(() => (saveStatus.textContent = ""), 2500);
});

testGeminiBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim() || Storage.DEFAULT_MODEL;

  if (!apiKey) {
    geminiTestStatus.className = "test-status error";
    geminiTestStatus.textContent = "⚠️ Vui lòng nhập Gemini API Key trước.";
    return;
  }

  geminiTestStatus.className = "test-status loading";
  geminiTestStatus.textContent = "Đang kiểm tra kết nối Gemini...";
  testGeminiBtn.disabled = true;

  try {
    await Api.testConnection("gemini", apiKey, model);
    geminiTestStatus.className = "test-status success";
    geminiTestStatus.textContent = "✅ Kết nối Gemini thành công!";
  } catch (err) {
    geminiTestStatus.className = "test-status error";
    geminiTestStatus.textContent = `❌ Thất bại: ${err.message}`;
  } finally {
    testGeminiBtn.disabled = false;
  }
});

testOpenaiBtn.addEventListener("click", async () => {
  const apiKey = openaiApiKeyInput.value.trim();
  const model = openaiModelInput.value.trim() || Storage.DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    openaiTestStatus.className = "test-status error";
    openaiTestStatus.textContent = "⚠️ Vui lòng nhập OpenAI API Key trước.";
    return;
  }

  openaiTestStatus.className = "test-status loading";
  openaiTestStatus.textContent = "Đang kiểm tra kết nối OpenAI...";
  testOpenaiBtn.disabled = true;

  try {
    await Api.testConnection("openai", apiKey, model);
    openaiTestStatus.className = "test-status success";
    openaiTestStatus.textContent = "✅ Kết nối OpenAI thành công!";
  } catch (err) {
    openaiTestStatus.className = "test-status error";
    openaiTestStatus.textContent = `❌ Thất bại: ${err.message}`;
  } finally {
    testOpenaiBtn.disabled = false;
  }
});

loadSettings();
