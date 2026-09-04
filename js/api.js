const SYSTEM_PROMPT = `Bạn là trợ lý hỗ trợ người Việt học phát âm và ngữ nghĩa tiếng Anh. Input sẽ có trường "task" xác định loại yêu cầu:

- task = "pronunciation": nhận một từ mới và danh sách từ đã có. Trả về phiên âm IPA chuẩn Anh-Mỹ, mô tả ngắn gọn bằng tiếng Việt cách đặt lưỡi/môi/hơi để đọc đúng, và so sánh với từ nào trong danh sách dễ gây nhầm lẫn về âm (nếu không có từ nào gần giống, để mảng rỗng).

- task = "phrase_meaning": nhận một cụm từ (phrasal verb/idiom). Trả về nghĩa hiện tại (tiếng Việt), nghĩa đen của từng từ thành phần, và lý do ghép ra nghĩa đó - liên hệ hình ảnh, logic dễ nhớ. Nếu không chắc chắn đây là nguồn gốc từ nguyên lịch sử thật, phải nói rõ đây là cách liên tưởng để dễ nhớ, không bịa đặt thông tin lịch sử.

- task = "word_usage": nhận một từ. Trả về nghĩa (tiếng Việt), và danh sách các ngữ cảnh sử dụng cụ thể - mỗi ngữ cảnh gồm mô tả ngắn (khi nào/tình huống nào nên dùng từ này) kèm một câu ví dụ tiếng Anh minh họa. Nếu từ có sắc thái trang trọng/thân mật/kỹ thuật riêng, nêu rõ trong "notes".

- task = "word_comparison": nhận hai từ gần nghĩa nhau (synonym) nhưng khác nhau về ngữ cảnh sử dụng. Trả về nghĩa chung mà cả hai chia sẻ, liệt kê các điểm khác biệt cụ thể (sắc thái, mức độ trang trọng, loại ngữ cảnh, đối tượng đi kèm...), giải thích khi nào nên dùng từ A thay vì từ B và ngược lại, kèm câu ví dụ minh họa cho mỗi từ.

- task = "synonyms": nhận một từ. Trả về từ loại của từ gốc, và danh sách các từ đồng nghĩa (3-6 từ) - mỗi từ đồng nghĩa gồm: từ loại, phiên âm IPA chuẩn Anh-Mỹ, và giải thích ngắn gọn nên dùng từ này trong trường hợp/ngữ cảnh cụ thể nào (khác biệt sắc thái so với từ gốc và so với các từ đồng nghĩa khác trong danh sách), kèm một câu ví dụ minh họa.

Luôn trả về JSON đúng schema tương ứng với task nhận được, không kèm câu giải thích, không bọc markdown code fence.

Schema khi task = "pronunciation":
{
  "task": "pronunciation",
  "word": string,
  "ipa": string,
  "description": string,
  "confusable_with": [ { "word": string, "difference": string } ]
}

Schema khi task = "phrase_meaning":
{
  "task": "phrase_meaning",
  "phrase": string,
  "meaning": string,
  "literal_breakdown": string,
  "why_this_meaning": string,
  "is_confirmed_etymology": boolean
}

Schema khi task = "word_usage":
{
  "task": "word_usage",
  "word": string,
  "meaning": string,
  "usage_contexts": [ { "context": string, "example": string } ],
  "notes": string
}

Schema khi task = "word_comparison":
{
  "task": "word_comparison",
  "word_a": string,
  "word_b": string,
  "shared_meaning": string,
  "differences": [ { "aspect": string, "explanation": string } ],
  "when_to_use_a": string,
  "when_to_use_b": string,
  "example_a": string,
  "example_b": string
}

Schema khi task = "synonyms":
{
  "task": "synonyms",
  "word": string,
  "word_type": string,
  "synonyms": [
    {
      "word": string,
      "word_type": string,
      "ipa": string,
      "usage": string,
      "example": string
    }
  ]
}`;

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Yêu cầu quá thời gian chờ (30 giây). Vui lòng kiểm tra lại kết nối mạng.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

const Api = {
  async callGemini(userPayload, apiKey, model) {
    if (!apiKey) {
      throw new Error("Chưa cấu hình Gemini API key. Mở phần Tùy chọn của tiện ích để thêm key.");
    }

    const selectedModel = (model || Storage.DEFAULT_MODEL).trim().replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [{ text: JSON.stringify(userPayload) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `Gemini API lỗi (${response.status})`;
      try {
        const errJson = JSON.parse(errBody);
        if (response.status === 400 || response.status === 403) {
          errMsg = `Gemini API key không hợp lệ hoặc không có quyền truy cập (${response.status}): ${errJson.error?.message || ""}`;
        } else if (response.status === 404) {
          errMsg = `Model Gemini '${selectedModel}' không tồn tại hoặc chưa hỗ trợ v1beta (404).`;
        } else if (response.status === 429) {
          errMsg = `Gemini API báo hết hạn mức (Quota) hoặc gửi yêu cầu quá nhanh (429).`;
        } else if (errJson.error?.message) {
          errMsg += `: ${errJson.error.message}`;
        }
      } catch (e) {
        errMsg += `: ${errBody}`;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("Yêu cầu bị chặn bởi bộ lọc an toàn của Gemini (Safety Filter).");
    }

    let content = candidate?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Không nhận được nội dung phản hồi từ Gemini API.");
    }

    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(content);
  },

  async callOpenAI(userPayload, apiKey, model) {
    if (!apiKey) {
      throw new Error("Chưa cấu hình OpenAI API key. Mở phần Tùy chọn của tiện ích để thêm key.");
    }

    const selectedModel = (model || Storage.DEFAULT_OPENAI_MODEL).trim();
    const url = "https://api.openai.com/v1/chat/completions";

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `OpenAI API lỗi (${response.status})`;
      try {
        const errJson = JSON.parse(errBody);
        if (response.status === 401) {
          errMsg = `OpenAI API key không hợp lệ hoặc đã hết hạn (401).`;
        } else if (response.status === 429) {
          errMsg = `OpenAI API báo hết hạn mức (Quota Exceeded) hoặc gửi yêu cầu quá nhanh (429).`;
        } else if (response.status === 404) {
          errMsg = `Model OpenAI '${selectedModel}' không tồn tại hoặc tài khoản không có quyền truy cập (404).`;
        } else if (errJson.error?.message) {
          errMsg += `: ${errJson.error.message}`;
        }
      } catch (e) {
        errMsg += `: ${errBody}`;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Không nhận được nội dung phản hồi từ OpenAI API.");
    }

    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(content);
  },

  async testConnection(provider, apiKey, model) {
    const testPayload = { task: "pronunciation", new_word: "hello", existing_words: [] };
    if (provider === "openai") {
      return await Api.callOpenAI(testPayload, apiKey, model);
    } else {
      return await Api.callGemini(testPayload, apiKey, model);
    }
  },

  async callTask(userPayload) {
    const settings = await Storage.getSettings();
    if (settings.provider === "openai") {
      return Api.callOpenAI(userPayload, settings.openaiApiKey, settings.openaiModel);
    } else {
      return Api.callGemini(userPayload, settings.apiKey, settings.model);
    }
  },

  async getPronunciation(newWord, existingWords) {
    return Api.callTask({
      task: "pronunciation",
      existing_words: existingWords,
      new_word: newWord,
    });
  },

  async getPhraseMeaning(phrase) {
    return Api.callTask({
      task: "phrase_meaning",
      phrase,
    });
  },

  async getWordUsage(word) {
    return Api.callTask({
      task: "word_usage",
      word,
    });
  },

  async getWordComparison(wordA, wordB) {
    return Api.callTask({
      task: "word_comparison",
      word_a: wordA,
      word_b: wordB,
    });
  },

  async getSynonyms(word) {
    return Api.callTask({
      task: "synonyms",
      word,
    });
  },

  async translateGoogle(text, sl = "auto", tl = "vi") {
    const trimmed = (text || "").trim();
    if (!trimmed) {
      throw new Error("Vui lòng nhập từ hoặc câu cần dịch.");
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(trimmed)}`;

    const response = await fetchWithTimeout(url, {}, 15000);
    if (!response.ok) {
      throw new Error(`Google Dịch lỗi (${response.status})`);
    }

    const data = await response.json();

    let translatedText = "";
    let phonetic = "";
    if (Array.isArray(data[0])) {
      for (const item of data[0]) {
        if (item[0]) {
          translatedText += item[0];
        }
        if (item[3]) {
          phonetic = item[3];
        } else if (item[2] && !phonetic && typeof item[2] === "string") {
          phonetic = item[2];
        }
      }
    }

    const dict = [];
    if (Array.isArray(data[1])) {
      for (const group of data[1]) {
        const pos = group[0];
        const terms = Array.isArray(group[1]) ? group[1] : [];
        const details = Array.isArray(group[2])
          ? group[2].map((entry) => ({
              meaning: entry[0],
              reverseTranslations: Array.isArray(entry[1]) ? entry[1] : [],
            }))
          : [];
        dict.push({
          pos,
          terms,
          details,
        });
      }
    }

    const detectedSource = data[2] || (sl === "auto" ? "en" : sl);

    return {
      sourceText: trimmed,
      translatedText,
      phonetic,
      dict,
      sourceLang: detectedSource,
      targetLang: tl,
    };
  },
};
