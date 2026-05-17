export async function callAI(messages, options = {}) {
  const { temperature = 0.1, response_format = null, max_tokens = 2048 } = options;

  const providers = [
    {
      name: 'Groq',
      key: process.env.GROQ_API_KEY,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile'
    },
    {
      name: 'OpenAI',
      key: process.env.OPENAI_API_KEY,
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini' 
    },
    {
      name: 'OpenRouter',
      key: process.env.OPENROUTER_API_KEY,
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'meta-llama/llama-3.3-70b-instruct'
    },
    {
      name: 'Together',
      key: process.env.TOGETHER_API_KEY,
      url: 'https://api.together.xyz/v1/chat/completions',
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
    }
  ];

  const activeProviders = providers.filter(p => !!p.key);
  
  if (activeProviders.length === 0) {
    throw new Error('NO_API_KEYS: Please configure GROQ_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, or TOGETHER_API_KEY.');
  }

  let lastError = null;
  const errors = [];

  for (const provider of activeProviders) {
    try {
      const payload = {
        model: provider.model,
        messages: messages,
        temperature,
        max_tokens
      };
      
      if (response_format && provider.name !== 'OpenRouter') { 
        payload.response_format = response_format;
      }

      const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok || data.error) {
        lastError = data.error?.message || JSON.stringify(data.error) || 'Unknown API error';
        console.warn(`[AI Fallback] ${provider.name} failed:`, lastError);
        errors.push(`${provider.name}: ${lastError}`);
        continue;
      }

      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return { content: content.trim(), provider: provider.name };
      }
    } catch (e) {
      lastError = e.message;
      console.warn(`[AI Fallback] ${provider.name} network/fetch error:`, lastError);
      errors.push(`${provider.name}: ${lastError}`);
    }
  }

  throw new Error(`All configured AI providers failed. Errors: ${errors.join(' | ')}`);
}
