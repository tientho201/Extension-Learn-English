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

const Api = {
  async callTask(userPayload) {
    const { apiKey, model } = await Storage.getSettings();
    if (!apiKey) {
      throw new Error("Chưa cấu hình Gemini API key. Mở phần Tùy chọn của tiện ích để thêm key.");
    }

    const selectedModel = (model || Storage.DEFAULT_MODEL).trim().replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
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
        if (errJson.error?.message) {
          errMsg += `: ${errJson.error.message}`;
        } else {
          errMsg += `: ${errBody}`;
        }
      } catch (e) {
        errMsg += `: ${errBody}`;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Không nhận được nội dung phản hồi từ Gemini API.");
    }

    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(content);
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
};
