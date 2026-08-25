import { writeFileSync } from 'node:fs';

const API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const API_KEY = 'sk-cyc3c0ckl0hj8j96k68o702bhqtotnb0hl6mk34tz9csj6e2';

console.log('Testing speak (mimo-v2.5-tts, preset voice mimo_default)...');

const response = await fetch(API_URL, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mimo-v2.5-tts',
    messages: [
      { role: 'user', content: '温柔但疲惫，语速偏慢' },
      { role: 'assistant', content: '你好，这是一个语音测试。往生堂第七十七代堂主，胡桃，来也！' }
    ],
    audio: { format: 'wav', voice: 'mimo_default' },
    stream: false
  })
});

if (!response.ok) {
  console.error('HTTP error:', response.status, await response.text());
  process.exit(1);
}

const body = await response.json();
const audioData = body?.choices?.[0]?.message?.audio?.data;

if (!audioData) {
  console.error('No audio data in response:', JSON.stringify(body).slice(0, 500));
  process.exit(1);
}

const buf = Buffer.from(audioData, 'base64');
const outPath = 'tests/e2e_voice_speak_output.wav';
writeFileSync(outPath, buf);
console.log('SUCCESS: WAV file saved to', outPath, 'size:', buf.length, 'bytes');