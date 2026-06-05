import { randInt, randPick } from './random.js';

/** 生成正弦波 WAV Buffer */
export function generateWav(durationMs: number, frequency: number = 440, sampleRate: number = 44100): Buffer {
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const dataSize = numSamples * 2; // 16-bit mono
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);     // chunk size
  buf.writeUInt16LE(1, 20);      // PCM
  buf.writeUInt16LE(1, 22);      // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);      // block align
  buf.writeUInt16LE(16, 34);     // bits per sample
  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.1;
    buf.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buf;
}

// ============================================================
// 调式系统
// ============================================================

// 各种调式的音程模式（半音偏移量）
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  japanese: [0, 1, 5, 7, 8],
  arabic: [0, 1, 4, 5, 7, 8, 11],
  hungarian: [0, 2, 3, 6, 7, 8, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  augmented: [0, 3, 4, 7, 8, 11],
  bebop: [0, 2, 4, 5, 7, 9, 10, 11],
  hirajoshi: [0, 2, 3, 7, 8],
  insen: [0, 1, 5, 7, 10],
  iwato: [0, 1, 5, 6, 10],
  prometheus: [0, 2, 4, 6, 9, 10],
  enigmatic: [0, 1, 4, 6, 8, 10, 11],
};

// ============================================================
// 和弦系统
// ============================================================

// 和弦类型（相对于根音的半音偏移）
const CHORD_TYPES = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '9': [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  min9: [0, 3, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21],
};

// 和弦进行模板（罗马数字 -> 调式内音级，0-based）
const CHORD_PROGRESSIONS = [
  [0, 3, 4, 0],         // I-IV-V-I
  [0, 4, 5, 3],         // I-V-vi-IV (流行经典)
  [0, 5, 3, 4],         // I-vi-IV-V (50s)
  [1, 4, 0, 0],         // ii-V-I-I (爵士基本)
  [0, 3, 0, 4],         // I-IV-I-V (布鲁斯简化)
  [0, 5, 1, 4],         // I-vi-ii-V (循环)
  [0, 2, 3, 4],         // I-iii-IV-V
  [5, 3, 0, 4],         // vi-IV-I-V
  [0, 6, 3, 4],         // I-vii-IV-V
  [0, 3, 5, 4],         // I-IV-vi-V
  [1, 4, 0, 5],         // ii-V-I-vi
  [0, 0, 3, 3, 4, 4, 0, 0], // 12-bar 简化
  [0, 3, 4, 3],         // I-IV-V-IV (摇滚)
  [5, 4, 3, 0],         // vi-V-IV-I (逆行)
  [0, 2, 5, 3],         // I-iii-vi-IV
];

// ============================================================
// 节奏系统
// ============================================================

const RHYTHM_PATTERNS = [
  [1, 1, 1, 1],
  [2, 1, 1, 2, 1, 1],
  [1, 1, 2, 1, 1, 2],
  [3, 1, 2, 2],
  [1, 2, 1, 2, 1, 1],
  [1, 1, 1, 1, 2, 2],
  [2, 2, 1, 1, 1, 1],
  [1, 3, 1, 3],
  [1, 1, 1, 2, 1, 1, 1, 2],
  [3, 1, 1, 3, 1, 1],
  [1, 1, 2, 2, 1, 1],
  [4, 2, 1, 1],
  [1, 1, 1, 3],
  [2, 3, 2, 1],
  [1, 2, 3, 2],
];

// ============================================================
// 旋律走向系统
// ============================================================

const CONTOURS = [
  'ascending',
  'descending',
  'arch',
  'valley',
  'zigzag',
  'random_walk',
  'repetitive',
  'call_response',
  'spiral',        // 螺旋上升
  'cascade',       // 瀑布式下降
  'pendulum',      // 钟摆式
  'stepwise',      // 逐级进行
] as const;

// ============================================================
// 音色系统
// ============================================================

type WaveformType = 'sine' | 'triangle' | 'soft_square' | 'sawtooth' | 'organ' | 'bell' | 'pluck' | 'pad';

/** 根据波形类型和相位生成采样值 */
function generateWaveformSample(waveform: WaveformType, phase: number, posInNote: number): number {
  switch (waveform) {
    case 'sine':
      return Math.sin(phase);
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'soft_square':
      // 多个正弦波叠加模拟柔和方波
      return Math.sin(phase) * 0.7 + Math.sin(phase * 3) * 0.2 + Math.sin(phase * 5) * 0.07 + Math.sin(phase * 7) * 0.03;
    case 'sawtooth':
      // 锯齿波（多个泛音叠加）
      return Math.sin(phase) * 0.5 + Math.sin(phase * 2) * 0.25 + Math.sin(phase * 3) * 0.167 + Math.sin(phase * 4) * 0.125;
    case 'organ':
      // 管风琴（奇数泛音 + 偶数泛音轻微）
      return Math.sin(phase) * 0.5 + Math.sin(phase * 2) * 0.3 + Math.sin(phase * 3) * 0.15 + Math.sin(phase * 4) * 0.05;
    case 'bell':
      // 钟声（非谐波泛音 + 快速衰减高频）
      return Math.sin(phase) * 0.4 + Math.sin(phase * 2.756) * 0.3 * Math.exp(-posInNote * 3) +
        Math.sin(phase * 4.567) * 0.2 * Math.exp(-posInNote * 5) + Math.sin(phase * 6.234) * 0.1 * Math.exp(-posInNote * 8);
    case 'pluck':
      // 拨弦（高频快速衰减）
      return Math.sin(phase) * 0.5 + Math.sin(phase * 2) * 0.3 * Math.exp(-posInNote * 4) +
        Math.sin(phase * 3) * 0.15 * Math.exp(-posInNote * 6) + Math.sin(phase * 4) * 0.05 * Math.exp(-posInNote * 10);
    case 'pad':
      // 合成垫音（缓慢变化的和声）
      return Math.sin(phase) * 0.4 + Math.sin(phase * 1.01) * 0.3 + Math.sin(phase * 2) * 0.2 + Math.sin(phase * 0.99) * 0.1;
  }
}

// ============================================================
// 核心生成函数
// ============================================================

/** 根据 MIDI 音符号计算频率 (A4=69=440Hz) */
function midiToFreq(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/** 获取调式内的和弦类型 */
function getChordTypeForDegree(degree: number, scaleType: string): keyof typeof CHORD_TYPES {
  // 简化的和弦分配逻辑
  if (scaleType.includes('minor') || scaleType === 'dorian' || scaleType === 'phrygian') {
    const minorChords: (keyof typeof CHORD_TYPES)[] = ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'];
    return minorChords[degree % 7]!;
  }
  const majorChords: (keyof typeof CHORD_TYPES)[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'];
  return majorChords[degree % 7]!;
}

/** 生成旋律音符序列 */
function generateNoteSequence(noteCount: number): number[] {
  const scaleNames = Object.keys(SCALES) as (keyof typeof SCALES)[];
  const scale = SCALES[randPick(scaleNames)];
  const contour = randPick([...CONTOURS]);

  // 随机根音 (C3=48 到 C5=72)
  const rootMidi = randInt(48, 72);
  // 构建当前调式在多个八度内的可用音符
  const availableNotes: number[] = [];
  for (let octave = -1; octave <= 2; octave++) {
    for (const interval of scale) {
      availableNotes.push(rootMidi + octave * 12 + interval);
    }
  }
  // 过滤到合理范围 (MIDI 36-96, 约 C2-C7)
  const validNotes = availableNotes.filter(n => n >= 36 && n <= 96);

  const notes: number[] = [];
  let currentIdx = Math.floor(validNotes.length / 2);

  for (let i = 0; i < noteCount; i++) {
    const progress = i / (noteCount - 1 || 1);

    switch (contour) {
      case 'ascending':
        currentIdx = Math.floor(progress * (validNotes.length - 1));
        break;
      case 'descending':
        currentIdx = Math.floor((1 - progress) * (validNotes.length - 1));
        break;
      case 'arch':
        currentIdx = Math.floor(Math.sin(progress * Math.PI) * (validNotes.length - 1) * 0.4 + validNotes.length * 0.3);
        break;
      case 'valley':
        currentIdx = Math.floor((1 - Math.sin(progress * Math.PI)) * (validNotes.length - 1) * 0.4 + validNotes.length * 0.3);
        break;
      case 'zigzag':
        currentIdx += (i % 2 === 0) ? randInt(1, 3) : -randInt(1, 3);
        break;
      case 'random_walk':
        currentIdx += randInt(-2, 2);
        break;
      case 'repetitive': {
        const motifLen = randInt(3, 5);
        const motifPos = i % motifLen;
        if (i < motifLen) {
          currentIdx += randInt(-2, 2);
        } else {
          currentIdx = notes[motifPos] ? validNotes.indexOf(notes[motifPos]!) : currentIdx;
          if (currentIdx === -1) currentIdx = Math.floor(validNotes.length / 2);
        }
        break;
      }
      case 'call_response': {
        const half = noteCount / 2;
        if (i < half) {
          currentIdx += randInt(0, 2);
        } else {
          currentIdx -= randInt(0, 2);
        }
        break;
      }
      case 'spiral':
        // 螺旋：逐渐扩大的振幅
        currentIdx += Math.round(Math.sin(progress * Math.PI * 4) * (1 + progress * 3));
        break;
      case 'cascade':
        // 瀑布：短上行后长下行
        if (i % 5 === 0) currentIdx += randInt(2, 4);
        else currentIdx -= randInt(0, 1);
        break;
      case 'pendulum':
        // 钟摆：逐渐缩小的振幅
        currentIdx = Math.floor(validNotes.length / 2 + Math.sin(progress * Math.PI * 6) * (validNotes.length * 0.3 * (1 - progress)));
        break;
      case 'stepwise':
        // 逐级：大部分是级进，偶尔跳跃
        if (randInt(1, 10) <= 7) {
          currentIdx += randPick([-1, 1]);
        } else {
          currentIdx += randPick([-3, -2, 2, 3]);
        }
        break;
    }

    currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx));
    notes.push(validNotes[currentIdx]!);
  }

  return notes;
}

/** 生成和弦进行 */
function generateChordProgression(durationMs: number, rootMidi: number, scaleName: string): { notes: number[][]; durations: number[] } {
  const scale = SCALES[scaleName as keyof typeof SCALES] || SCALES.major;
  const progression = randPick(CHORD_PROGRESSIONS);

  // 每个和弦的时值
  const chordDuration = durationMs / progression.length;
  const durations = progression.map(() => chordDuration);

  const chords: number[][] = progression.map(degree => {
    // 计算这个音级的根音
    const chordRoot = rootMidi + (scale[degree % scale.length] || 0);
    // 获取和弦类型
    const chordTypeName = getChordTypeForDegree(degree, scaleName);
    const chordIntervals = CHORD_TYPES[chordTypeName];
    // 偶尔使用七和弦/九和弦增加丰富度
    const useExtension = randInt(1, 10) <= 3;
    let intervals = chordIntervals;
    if (useExtension) {
      const extensions: (keyof typeof CHORD_TYPES)[] = ['maj7', 'min7', 'dom7', 'add9', '6'];
      const extType = randPick(extensions);
      intervals = CHORD_TYPES[extType];
    }
    return intervals.map(interval => chordRoot + interval);
  });

  return { notes: chords, durations };
}

/** 写 WAV header */
function writeWavHeader(buf: Buffer, dataSize: number, sampleRate: number): void {
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
}

/** 计算 ADSR 包络值 */
function getEnvelope(posInNote: number, attack: number, decay: number, sustainLevel: number, release: number): number {
  if (posInNote < attack) {
    return posInNote / attack;
  } else if (posInNote < attack + decay) {
    return 1.0 - (1.0 - sustainLevel) * ((posInNote - attack) / decay);
  } else if (posInNote < 1.0 - release) {
    return sustainLevel;
  } else {
    return sustainLevel * Math.max(0, (1.0 - (posInNote - (1.0 - release)) / release));
  }
}

/** 生成随机旋律的 WAV Buffer（带和弦伴奏） */
export function generateMelodyWav(durationMs: number, sampleRate: number = 44100): Buffer {
  // 选择调式
  const scaleNames = Object.keys(SCALES) as (keyof typeof SCALES)[];
  const scaleName = randPick(scaleNames);
  const scale = SCALES[scaleName];

  // 随机根音
  const rootMidi = randInt(48, 66);

  // === 旋律部分 ===
  const rhythmPattern = randPick(RHYTHM_PATTERNS);
  const targetNotes = randInt(10, 24);
  const melodyDurations: number[] = [];
  while (melodyDurations.length < targetNotes) {
    for (const r of rhythmPattern) {
      melodyDurations.push(r);
      if (melodyDurations.length >= targetNotes) break;
    }
  }
  const noteCount = melodyDurations.length;
  const totalMelodyRhythm = melodyDurations.reduce((a, b) => a + b, 0);
  const melodyNoteDurations = melodyDurations.map(d => (d / totalMelodyRhythm) * durationMs);
  const melodyNotes = generateNoteSequence(noteCount);

  // === 和弦部分 ===
  const hasChords = randInt(1, 10) <= 7; // 70% 概率有和弦伴奏
  const chordData = hasChords ? generateChordProgression(durationMs, rootMidi - 12, scaleName) : null;

  // === 音色选择 ===
  const allWaveforms: WaveformType[] = ['sine', 'triangle', 'soft_square', 'sawtooth', 'organ', 'bell', 'pluck', 'pad'];
  const melodyWaveform = randPick(allWaveforms);
  const chordWaveform = randPick(['pad', 'organ', 'sine', 'triangle'] as WaveformType[]);

  // === 生成音频 ===
  const totalSamples = Math.floor(sampleRate * durationMs / 1000);
  const dataSize = totalSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  writeWavHeader(buf, dataSize, sampleRate);

  // 预计算旋律音符时间点
  const melodyStarts: number[] = [];
  let accMs = 0;
  for (let n = 0; n < noteCount; n++) {
    melodyStarts.push(Math.floor(sampleRate * accMs / 1000));
    accMs += melodyNoteDurations[n]!;
  }
  melodyStarts.push(totalSamples);

  // 预计算和弦时间点
  const chordStarts: number[] = [];
  if (chordData) {
    let chordAccMs = 0;
    for (let n = 0; n < chordData.notes.length; n++) {
      chordStarts.push(Math.floor(sampleRate * chordAccMs / 1000));
      chordAccMs += chordData.durations[n]!;
    }
    chordStarts.push(totalSamples);
  }

  // 旋律 ADSR 参数（根据音色不同调整）
  const melodyADSR = melodyWaveform === 'bell' ? { a: 0.01, d: 0.3, s: 0.2, r: 0.4 }
    : melodyWaveform === 'pluck' ? { a: 0.005, d: 0.2, s: 0.3, r: 0.3 }
    : melodyWaveform === 'pad' ? { a: 0.15, d: 0.1, s: 0.8, r: 0.2 }
    : { a: 0.03, d: 0.1, s: 0.7, r: 0.15 };

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sampleValue = 0;

    // --- 旋律层 ---
    let melodyIdx = 0;
    for (let n = 0; n < noteCount; n++) {
      if (i >= melodyStarts[n]! && i < melodyStarts[n + 1]!) {
        melodyIdx = n;
        break;
      }
    }
    const melodyFreq = midiToFreq(melodyNotes[melodyIdx]!);
    const melodyNoteStart = melodyStarts[melodyIdx]!;
    const melodyNoteEnd = melodyStarts[melodyIdx + 1]!;
    const melodyNoteLen = melodyNoteEnd - melodyNoteStart;
    const melodyPos = (i - melodyNoteStart) / melodyNoteLen;
    const melodyEnv = getEnvelope(melodyPos, melodyADSR.a, melodyADSR.d, melodyADSR.s, melodyADSR.r);
    const melodyPhase = 2 * Math.PI * melodyFreq * t;
    sampleValue += generateWaveformSample(melodyWaveform, melodyPhase, melodyPos) * melodyEnv * 0.6;

    // --- 和弦层 ---
    if (chordData && chordStarts.length > 1) {
      let chordIdx = 0;
      for (let n = 0; n < chordData.notes.length; n++) {
        if (i >= chordStarts[n]! && i < chordStarts[n + 1]!) {
          chordIdx = n;
          break;
        }
      }
      const chordNoteStart = chordStarts[chordIdx]!;
      const chordNoteEnd = chordStarts[chordIdx + 1]!;
      const chordNoteLen = chordNoteEnd - chordNoteStart;
      const chordPos = (i - chordNoteStart) / chordNoteLen;
      const chordEnv = getEnvelope(chordPos, 0.08, 0.1, 0.6, 0.2);
      const chordNotes = chordData.notes[chordIdx]!;

      // 叠加和弦中每个音
      for (const note of chordNotes) {
        const chordFreq = midiToFreq(note);
        const chordPhase = 2 * Math.PI * chordFreq * t;
        sampleValue += generateWaveformSample(chordWaveform, chordPhase, chordPos) * chordEnv * (0.25 / chordNotes.length);
      }
    }

    // 总音量控制 + 软削波
    const finalSample = Math.tanh(sampleValue * 0.9) * 0.1;
    buf.writeInt16LE(Math.round(finalSample * 32767), 44 + i * 2);
  }
  return buf;
}
