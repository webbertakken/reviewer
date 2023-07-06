const openApiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (openApiKey?.startsWith('sk-')) {
  console.log('OpenAI API key is set');
} else {
  console.log('OpenAI API key is NOT set.');
}

console.log('Hello World');
