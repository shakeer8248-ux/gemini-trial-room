import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

// The SDK automatically finds the GEMINI_API_KEY in your environment variables
const ai = new GoogleGenAI({});

app.use(express.static(__dirname));

app.post('/api/generate', upload.fields([{ name: 'person' }, { name: 'garment' }]), async (req, res) => {
    try {
        const personImage = req.files['person'][0];
        const garmentImage = req.files['garment'][0];

        // 1. Convert the uploaded photos into base64 format so Google can read them
        const personBase64 = fs.readFileSync(personImage.path).toString('base64');
        const garmentBase64 = fs.readFileSync(garmentImage.path).toString('base64');

        // Clean up mobile uploads immediately
        fs.unlinkSync(personImage.path);
        fs.unlinkSync(garmentImage.path);

        // 2. Call generateContent with the correct multimodal setup
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            config: { 
                responseModalities: ['IMAGE'] // This forces the model to draw an image instead of writing text
            },
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "Combine this person and this clothing item into one hyper-realistic, high-fidelity fashion photography shot." },
                        { inlineData: { data: personBase64, mimeType: personImage.mimetype } },
                        { inlineData: { data: garmentBase64, mimeType: garmentImage.mimetype } }
                    ]
                }
            ]
        });

        // 3. Extract the image from Google's response
        const generatedImageData = response.candidates[0].content.parts[0].inlineData.data;
        const mimeType = response.candidates[0].content.parts[0].inlineData.mimeType || 'image/jpeg';
        const imageUrl = `data:${mimeType};base64,${generatedImageData}`;

        res.json({ success: true, imageUrl: imageUrl });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ success: false, error: "Failed to generate image" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
