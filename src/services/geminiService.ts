// @ts-ignore: @google/genai is loaded via importmap in index.html
import { GoogleGenAI } from "@google/genai";

// Объявляем наличие process для типизации, если @types/node не установлены
declare const process: {
  env: {
    API_KEY?: string;
    NODE_ENV?: string;
  };
};

const getApiKey = (): string => {
  try {
    return process.env.API_KEY || "";
  } catch {
    return "";
  }
};

const apiKey = getApiKey();

export const getLogisticsInsights = async (
  prompt: string,
  context?: string
): Promise<string> => {
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "Модуль AI Gemini ожидает подключения API-ключа. В данный момент я работаю в режиме системного ассистента.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Ты — ИИ-ассистент системы LogiShift (KONTROLSMEN). 
          Запрос: ${prompt}
          Контекст: ${context || ""}`,
        },
      ],
    });
    return response.text || "Нет ответа от ИИ.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ошибка ИИ-модуля.";
  }
};
