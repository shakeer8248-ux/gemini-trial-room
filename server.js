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

        // Clean up mobile uploads immediately
        fs.unlinkSync(personImage.path);
        fs.unlinkSync(garmentImage.path);

        // Call the Gemini Image Generation API
        // Note: For true multi-image blending, prompt tuning is required. 
        // This demonstrates the core connection.
        const response = await ai.models.generateImages({
            model: 'gemini-3.1-flash-image-preview',
            prompt: "A hyper-realistic, high-fidelity fashion photography shot of a person wearing a stylish outfit.",
            numberOfImages: 1,
            outputMimeType: "image/jpeg"
        });

        // Gemini returns the image as base64 data
        const base64Image = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;

        res.json({ success: true, imageUrl: imageUrl });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ success: false, error: "Failed to generate image" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
