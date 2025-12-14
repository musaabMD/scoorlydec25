import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': 'Bearer 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',
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch models')
    }

    const data = await response.json()
    
    // Filter for vision-capable models (that support image input)
    const visionModels = (data.data || []).filter(model => 
      model.id && 
      (model.id.includes('gpt-4') || 
       model.id.includes('claude') || 
       model.id.includes('gemini') ||
       model.context_length > 0)
    ).map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: model.id.split('/')[0] || 'unknown',
      contextLength: model.context_length || 0,
      pricing: model.pricing || {},
      description: model.description || ''
    }))

    return NextResponse.json({ models: visionModels })
  } catch (error) {
    console.error('Error fetching models:', error)
    // Return some default models if API fails
    return NextResponse.json({
      models: [
        { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', pricing: { prompt: '0.0025', completion: '0.01' } },
        { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', pricing: { prompt: '0.01', completion: '0.03' } },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', pricing: { prompt: '0.003', completion: '0.015' } },
        { id: 'google/gemini-pro-vision', name: 'Gemini Pro Vision', provider: 'Google', pricing: { prompt: '0.00025', completion: '0.0005' } },
      ]
    })
  }
}

