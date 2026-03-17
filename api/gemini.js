const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001"
];

let cachedGeminiModel = null;

module.exports = async (req, res) => {
    if(req.method !== "POST"){
        res.status(405).json({ error: "Method not allowed." });
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if(!apiKey){
        res.status(500).json({ error: "Server misconfiguration: GEMINI_API_KEY is missing." });
        return;
    }

    let body = req.body;
    if(typeof body === "string"){
        try{
            body = JSON.parse(body);
        }
        catch(_err){
            body = {};
        }
    }

    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if(!prompt){
        res.status(400).json({ error: "Prompt is required." });
        return;
    }

    const modelsToTry = cachedGeminiModel
        ? [cachedGeminiModel, ...GEMINI_MODEL_CANDIDATES.filter(model => model !== cachedGeminiModel)]
        : [...GEMINI_MODEL_CANDIDATES];

    let lastError = null;

    for(const model of modelsToTry){
        const response = await fetch(
            `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ]
                })
            }
        );

        if(response.ok){
            cachedGeminiModel = model;
            const data = await response.json();
            res.status(200).json(data);
            return;
        }

        let errorText = "";
        try{
            errorText = await response.text();
        }
        catch(_err){
            errorText = "";
        }

        if(response.status === 404){
            lastError = new Error(`Model '${model}' not found for this API key.`);
            continue;
        }

        let message = `API request failed (${response.status})`;
        if(errorText){
            try{
                let parsed = JSON.parse(errorText);
                if(parsed?.error?.message){
                    message += `: ${parsed.error.message}`;
                }
                else{
                    message += `: ${errorText}`;
                }
            }
            catch(_jsonErr){
                message += `: ${errorText}`;
            }
        }

        res.status(response.status).json({ error: message });
        return;
    }

    if(lastError){
        res.status(404).json({ error: lastError.message });
        return;
    }

    res.status(500).json({ error: "No compatible Gemini model was available." });
};
