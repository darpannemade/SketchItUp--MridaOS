import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { authenticateUser } from '../_shared/auth.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeminiVisionRequest {
  /** base64-encoded image string (no data: prefix) */
  imageBase64: string;
  /** mime type of the image */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** crop name for context e.g. "Nashik Table Grapes (Thompson Seedless)" */
  crop: string;
  /** available inventory SKUs to cross-reference for remedy recommendations */
  inventoryContext?: { name: string; sku: string; inStock: boolean }[];
}

interface DiagnosticResult {
  diseaseName: string;
  crop: string;
  confidence: number;
  severity: 'Low' | 'Moderate' | 'Severe';
  symptoms: string[];
  scientificName: string;
  recommendedTreatments: {
    productName: string;
    inStock: boolean;
    dosage: string;
    instructions: string;
  }[];
  aiGenerated: true;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(crop: string, inventoryContext?: GeminiVisionRequest['inventoryContext']): string {
  const inventoryList = inventoryContext?.length
    ? `\n\nAvailable in-store inventory (cross-reference for remedy recommendations):\n${inventoryContext.map(i => `- ${i.name} (SKU: ${i.sku}) — ${i.inStock ? 'IN STOCK' : 'OUT OF STOCK'}`).join('\n')}`
    : '';

  return `You are an expert Indian agricultural plant pathologist and crop protection specialist working for MridaOS Agri Retail in Maharashtra, India.

Analyze this crop image for: ${crop}

Identify the disease, pest, or deficiency visible and respond ONLY with a valid JSON object in this exact format (no markdown, no explanation outside the JSON):

{
  "diseaseName": "string — common name of the disease/pest/deficiency",
  "scientificName": "string — scientific name if applicable",
  "confidence": number between 0 and 100,
  "severity": "Low" | "Moderate" | "Severe",
  "symptoms": ["string", "string", "string"] — 3 to 5 observable symptoms,
  "recommendedTreatments": [
    {
      "productName": "string — generic or brand name of the treatment",
      "dosage": "string — specific dosage e.g. '2ml per litre of water'",
      "instructions": "string — application method and timing"
    }
  ]
}

Rules:
- Recommend treatments that are legally approved for use in India under CIB&RC
- Prioritise products commonly stocked by Maharashtra agri-input retailers
- If severity is Severe, include at least 2 treatment options
- If the image is unclear or not a crop, set confidence below 30 and diseaseName to "Unable to identify — image unclear"
- Respond with JSON only, no preamble${inventoryList}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Only POST is supported', 405);
  }

  // Authenticate — must be a logged-in MridaOS user
  const { user, error: authError } = await authenticateUser(req);
  if (authError) return authError;
  if (!user) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  // Only roles that need crop diagnostics
  const allowedRoles = ['owner', 'admin', 'counter_staff', 'nursery'];
  if (!allowedRoles.includes(user.role)) {
    return errorResponse('FORBIDDEN', 'Insufficient role for crop diagnostics', 403);
  }

  // Parse request body
  let body: GeminiVisionRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { imageBase64, mimeType, crop, inventoryContext } = body;

  if (!imageBase64 || !mimeType || !crop) {
    return errorResponse('BAD_REQUEST', 'imageBase64, mimeType, and crop are required', 400);
  }

  // Get API key from Supabase secrets — never from the client
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return errorResponse('CONFIGURATION_ERROR', 'Gemini API key not configured on server', 500);
  }

  try {
    // Call Gemini Vision API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: buildPrompt(crop, inventoryContext),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,      // Low temp = consistent, factual output
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', errText);
      return errorResponse('GEMINI_ERROR', 'Gemini API call failed', 502);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse Gemini's JSON response safely
    let diagnosis: Omit<DiagnosticResult, 'aiGenerated' | 'crop'>;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      diagnosis = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Gemini response as JSON:', rawText);
      return errorResponse('PARSE_ERROR', 'Gemini returned unexpected format', 502);
    }

    // Cross-reference with inventory if provided
    if (inventoryContext?.length && diagnosis.recommendedTreatments) {
      diagnosis.recommendedTreatments = diagnosis.recommendedTreatments.map(treatment => {
        const match = inventoryContext.find(item =>
          item.name.toLowerCase().includes(treatment.productName.toLowerCase()) ||
          treatment.productName.toLowerCase().includes(item.name.toLowerCase())
        );
        return {
          ...treatment,
          inStock: match ? match.inStock : false,
        };
      });
    }

    const result: DiagnosticResult = {
      ...diagnosis,
      crop,
      confidence: Math.min(100, Math.max(0, diagnosis.confidence ?? 0)),
      aiGenerated: true,
    };

    return successResponse(result);

  } catch (err) {
    console.error('Unexpected error in gemini-vision function:', err);
    return errorResponse('INTERNAL_ERROR', 'Unexpected server error', 500);
  }
});
