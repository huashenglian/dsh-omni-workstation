import { writeFileSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

const API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const API_KEY = 'sk-cyc3c0ckl0hj8j96k68o702bhqtotnb0hl6mk34tz9csj6e2';
const SAMPLE_PATH = 'D:/Document/Document/AI_project/software/工作台/deepseek_harness/克隆语音/胡桃/vo_BZLQ001_4_hutao_07.wav';

console.log('Testing clone_voice (mimo-v2.5-tts-voiceclone, 胡桃 sample)...');
console.log('Sample path:', SAMPLE_PATH);

const sampleBuf = readFileSync(SAMPLE_PATH);
console.log('Sample file size:', sampleBuf.length, 'bytes');

const b64 = sampleBuf.toString('base64');
console.log('Base64 length:', b64.length, 'chars');

if (b64.length > 10 * 1024 * 1024) {
  console.error('Sample too large (base64 > 10MB)');
  process.exit(1);
}

const mime = extname(SAMPLE_PATH).toLowerCase() === '.wav' ? 'audio/wav' : 'audio/mpeg';

const response = await fetch(API_URL, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mimo-v2.5-tts-voiceclone',
    messages: [
      { role: 'user', content: '' },
      { role: 'assistant', content: '往生堂第七十七代堂主，胡桃，来也！' }
    ],
    audio: { format: 'wav', voice: 'data:' + mime + ';base64,' + b64 },
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
const outPath = 'tests/e2e_voice_clone_output.wav';
writeFileSync(outPath, buf);
console.log('SUCCESS: Cloned WAV file saved to', outPath, 'size:', buf.length, 'bytes');