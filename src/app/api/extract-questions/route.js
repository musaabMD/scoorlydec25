import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { pageImageBase64, model = 'openai/gpt-4o' } = await request.json()

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all questions from this PDF page image. For each question, return a JSON object with the following structure:
- For MCQ questions: { "type": "mcq", "question": "question text", "choices": ["A) option1", "B) option2", ...], "correctAnswer": "A" or the letter, "explanation": "explanation if available" or null }
- For other questions: { "type": "other", "question": "question text", "explanation": "explanation if available" or null }

Return a JSON array of question objects. If no questions found, return empty array []. Only return valid JSON, no other text. Make sure to extract all choices for MCQ questions and identify the correct answer.`
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
        max_tokens: 4000
      })
    })

    const data = await response.json()
    
    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content.trim()
      
      // Try to parse JSON, handling cases where it's wrapped in markdown code blocks
      let parsed
      try {
        // Remove markdown code blocks if present
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        // If parsing fails, try to extract JSON from the text
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          parsed = []
        }
      }
      
      return NextResponse.json({ questions: Array.isArray(parsed) ? parsed : [] })
    }

    return NextResponse.json({ questions: [] })
  } catch (error) {
    console.error('Error extracting questions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

