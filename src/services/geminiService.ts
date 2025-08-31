
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GameObject } from "../types";

// Try multiple ways to get the API key for different environments
const API_KEY = process.env.GEMINI_API_KEY || 
                (import.meta as any)?.env?.VITE_GEMINI_API_KEY || 
                (window as any)?.__GEMINI_API_KEY__;

if (!API_KEY) {
    // In a real app, you might want a more graceful fallback or a user-facing error.
    // For this example, we'll throw an error during development.
    const message = "Die Gemini API-Schlüssel (GEMINI_API_KEY) Variable ist nicht gesetzt. Bitte fügen Sie sie zu Ihrer Umgebung hinzu.";
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="color: red; padding: 20px; text-align: center; font-family: sans-serif;">${message}</div>`;
    }
    throw new Error(message);
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
    try {
        if (!response || !response.response) {
            console.error(`Gemini response is empty or invalid for ${context}.`);
            if (response?.promptFeedback?.blockReason) {
                console.error(`Request was blocked. Reason: ${response.promptFeedback.blockReason}`);
            }
            console.error("Full Gemini Response object:", response);
            return [];
        }

        const jsonText = response.response.text()?.trim();
        if (!jsonText) {
            console.error(`Received empty text from Gemini for ${context}.`);
            return [];
        }

        const result = JSON.parse(jsonText);
        if (Array.isArray(result)) {
            return result;
        }
        console.warn(`Parsed JSON for ${context} is not an array:`, result);
        return [];
    } catch (e) {
        console.error(`Failed to parse JSON for ${context}:`, e);
        console.error("Raw Gemini Response:", response);
        return [];
    }
};

export const detectObjects = async (imageData: string): Promise<any[]> => {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const prompt = "Give the segmentation masks for all objects. Output a JSON list of segmentation masks where each entry contains the 2D bounding box in the key box_2d, the segmentation mask in key mask, and the text label in language Deutsch in the key label. Use descriptive labels in Deutsch. Ensure labels are in Deutsch. DO NOT USE ENGLISH FOR LABELS.";

    const model = ai.getGenerativeModel({ model: visionModel });
    const response = await model.generateContent({
      contents: [{ parts: [imageToPart(imageData), { text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: objectDetectionSchema,
      }
    });

    return parseJsonResponse(response, "object detection");
  } catch (error) {
    console.error('Error in detectObjects:', error);
    throw new Error(`Failed to detect objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


export const guessObjectsFromDescription = async (imageData: string, description: string): Promise<any[]> => {
    try {
        const prompt = `Du spielst "Ich sehe was, was du nicht siehst". Der Hinweis des Benutzers lautet: "${description}". Analysiere das Bild und identifiziere alle Objekte, die auf diese Beschreibung passen. Gib nur die Masken für die passenden Objekte zurück, sortiert nach der höchsten Wahrscheinlichkeit.`;

        const model = ai.getGenerativeModel({ model: visionModel });
        const response = await model.generateContent({
            contents: [{ parts: [imageToPart(imageData), { text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: objectDetectionSchema,
            }
        });

        return parseJsonResponse(response, "object guessing");
    } catch (error) {
        console.error('Error in guessObjectsFromDescription:', error);
        throw new Error(`Failed to guess objects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};


export const generateDescriptionForObject = async (imageData: string, object: GameObject): Promise<string> => {
    try {
        const prompt = `Du spielst "Ich sehe was, was du nicht siehst" und hast ein Objekt ausgewählt. Das ausgewählte Objekt ist "${object.label}". Bitte erstelle eine kurze, eindeutige Beschreibung für dieses Objekt, basierend auf seinen visuellen Merkmalen (z.B. Farbe, Form, Textur), ohne den Namen des Objekts zu nennen. Antworte nur mit dem beschreibenden Teil des Satzes. Beispiel: "ist rot und rund".`;

        const model = ai.getGenerativeModel({ model: visionModel });
        const response = await model.generateContent({
            contents: [{ parts: [imageToPart(imageData), { text: prompt }] }]
        });
        
        return response?.response?.text()?.trim() || "konnte keine Beschreibung erstellen";
    } catch (error) {
        console.error('Error in generateDescriptionForObject:', error);
        return "konnte keine Beschreibung erstellen";
    }
};
