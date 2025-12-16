import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { pageImageBase64, model = 'openai/gpt-4o' } = await request.json()

    if (!pageImageBase64) {
      return NextResponse.json({ error: 'No image provided', questions: [] }, { status: 400 })
    }

    console.log(`[extract-questions] Starting extraction with model: ${model}`)
    const startTime = Date.now()

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || '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'}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scoorly.com',
        'X-Title': 'Scoorly PDF Question Extractor'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a question extraction assistant. Analyze this PDF page image and extract ALL questions you can find.

For each question found, return a JSON object:
- MCQ questions: { "type": "mcq", "question": "full question text", "choices": ["A) option1", "B) option2", "C) option3", "D) option4"], "correctAnswer": "A", "explanation": "explanation if shown" }
- Other questions: { "type": "other", "question": "full question text", "explanation": null }

IMPORTANT:
1. Extract EVERY question visible on the page
2. Include all answer choices for MCQs (A, B, C, D, E if present)
3. If correct answer is marked/highlighted, include it
4. Return ONLY a valid JSON array, no other text
5. If no questions found, return []

Output format: [{"type":"mcq","question":"...","choices":["A)...","B)..."],"correctAnswer":"A","explanation":null}]`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${pageImageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    })

    const elapsed = Date.now() - startTime
    console.log(`[extract-questions] OpenRouter response received in ${elapsed}ms, status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[extract-questions] OpenRouter error: ${response.status} - ${errorText}`)
      return NextResponse.json({ error: `OpenRouter API error: ${response.status}`, questions: [] }, { status: response.status })
    }

    const data = await response.json()
    
    if (data.error) {
      console.error(`[extract-questions] OpenRouter returned error:`, data.error)
      return NextResponse.json({ error: data.error.message || 'OpenRouter error', questions: [] }, { status: 500 })
    }
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content?.trim() || ''
      console.log(`[extract-questions] Raw response length: ${content.length} chars`)
      
      // Try to parse JSON, handling cases where it's wrapped in markdown code blocks
      let parsed = []
      try {
        // Remove markdown code blocks if present
        let cleaned = content.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
        
        // Try to find JSON array in the content
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          cleaned = arrayMatch[0]
        }
        
        parsed = JSON.parse(cleaned)
        console.log(`[extract-questions] Parsed ${Array.isArray(parsed) ? parsed.length : 0} questions`)
      } catch (parseError) {
        console.error(`[extract-questions] JSON parse error:`, parseError.message)
        console.error(`[extract-questions] Content that failed to parse:`, content.substring(0, 500))
        
        // Try one more time to extract any JSON array
        try {
          const jsonMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/g)
          if (jsonMatch && jsonMatch.length > 0) {
            parsed = JSON.parse(jsonMatch[0])
          }
        } catch {
          parsed = []
        }
      }
      
      const questions = Array.isArray(parsed) ? parsed : []
      console.log(`[extract-questions] Returning ${questions.length} questions`)
      return NextResponse.json({ questions })
    }

    console.log(`[extract-questions] No valid response from model`)
    return NextResponse.json({ questions: [] })
  } catch (error) {
    console.error('[extract-questions] Error:', error)
    return NextResponse.json({ error: error.message, questions: [] }, { status: 500 })
  }
}

