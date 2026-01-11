
// @ts-ignore: @google/genai is loaded via importmap in index.html
import { GoogleGenAI } from "@google/genai";

// Объявляем наличие process для типизации
declare const process: {
  env: {
    API_KEY: string;
    NODE_ENV?: string;
  };
};

/**
 * Получает аналитические данные от Gemini AI.
 * Использует process.env.API_KEY напрямую согласно руководству.
 */
export const getLogisticsInsights = async (prompt: string, context?: string): Promise<string> => {
  try {
    // Согласно руководству, создаем экземпляр прямо перед вызовом и используем process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Ты — ИИ-ассистент системы LogiShift (KONTROLSMEN). 
          Запрос: ${prompt}
          Контекст: ${context || ''}`
    });

    // Используем свойство .text напрямую (не метод), как указано в документации
    return response.text || "Нет ответа от ИИ.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ошибка ИИ-модуля.";
  }
};
