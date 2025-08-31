
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GameObject } from "../types";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const visionModel = 'gemini-2.5-flash';

const objectDetectionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      label: {
        type: Type.STRING,
        description: "Eine kurze, beschreibende Bezeichnung für das Objekt in deutscher Sprache.",
      },
      mask: {
        type: Type.ARRAY,
        description: "Ein Polygon, das die Segmentierungsmaske des Objekts darstellt. Dies ist ein Array von Arrays, wobei jedes innere Array ein [x, y]-Paar normalisierter Koordinaten (0-1) ist.",
        items: {
            type: Type.ARRAY,
            items: {
                type: Type.NUMBER
            }
        }
      },
    },
    required: ["label", "mask"],
  },
};


const imageToPart = (imageData: string) => {
  return {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageData.split(',')[1],
    },
  };
};

const parseJsonResponse = (response: GenerateContentResponse, context: string): any[] => {
    if (!response || !response.text) {
        console.error(`Gemini response is empty or invalid for ${context}.`);
        if (response?.promptFeedback?.blockReason) {
            console.error(`Request was blocked. Reason: ${response.promptFeedback.blockReason}`);
        }
        console.error("Full Gemini Response object:", response);
        return [];
    }

    const jsonText = response.text.trim();
    if (!jsonText) {
        console.error(`Received empty text from Gemini for ${context}.`);
        return [];
    }

    try {
        const result = JSON.parse(jsonText);
        if (Array.isArray(result)) {
            return result;
        }
        console.warn(`Parsed JSON for ${context} is not an array:`, result);
        return [];
    } catch (e) {
        console.error(`Failed to parse JSON for ${context}:`, e);
        console.error("Raw Gemini Text:", response.text);
        return [];
    }
};

export const detectObjects = async (imageData: string): Promise<any[]> => {
  const prompt = "Analysiere das Bild und identifiziere alle sichtbaren, unterschiedlichen Objekte. Gib für jedes Objekt eine Segmentierungsmaske als Polygon und eine Bezeichnung auf Deutsch zurück. Konzentriere dich auf die Hauptobjekte.";

  const response = await ai.models.generateContent({
    model: visionModel,
    contents: { parts: [imageToPart(imageData), { text: prompt }] },
    config: {
        responseMimeType: "application/json",
        responseSchema: objectDetectionSchema,
    }
  });

  return parseJsonResponse(response, "object detection");
};


export const guessObjectsFromDescription = async (imageData: string, description: string): Promise<any[]> => {
    const prompt = `Du spielst "Ich sehe was, was du nicht siehst". Der Hinweis des Benutzers lautet: "${description}". Analysiere das Bild und identifiziere alle Objekte, die auf diese Beschreibung passen. Gib nur die Masken für die passenden Objekte zurück, sortiert nach der höchsten Wahrscheinlichkeit.`;

    const response = await ai.models.generateContent({
        model: visionModel,
        contents: { parts: [imageToPart(imageData), { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: objectDetectionSchema,
        }
    });

    return parseJsonResponse(response, "object guessing");
};


export const generateDescriptionForObject = async (imageData: string, object: GameObject): Promise<string> => {
    const prompt = `Du spielst "Ich sehe was, was du nicht siehst" und hast ein Objekt ausgewählt. Das ausgewählte Objekt ist "${object.label}". Bitte erstelle eine kurze, eindeutige Beschreibung für dieses Objekt, basierend auf seinen visuellen Merkmalen (z.B. Farbe, Form, Textur), ohne den Namen des Objekts zu nennen. Antworte nur mit dem beschreibenden Teil des Satzes. Beispiel: "ist rot und rund".`;

    const response = await ai.models.generateContent({
        model: visionModel,
        contents: { parts: [imageToPart(imageData), { text: prompt }] }
    });
    // For simple text responses, we can be less defensive, but still check for existence.
    return response?.text?.trim() || "konnte keine Beschreibung erstellen";
};
