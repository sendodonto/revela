"""Synthesizes the demo's soft piano/pad track (original, no third-party audio) -> public/demo/music/ambiente.mp3.

Run: python tools/make-music.py   (needs numpy and ffmpeg)
"""
import os, subprocess, wave
import numpy as np

SR = 44100
BEAT = 60 / 66
rng = np.random.default_rng(7)
note = lambda n: 440 * 2 ** ((n - 69) / 12)

def piano(f, dur, vel):
    t = np.arange(int(SR * dur)) / SR
    tone = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.2 + k * 0.9)) for k, a in ((1, 1), (2, .35), (3, .12), (4, .05)))
    attack = np.minimum(1, t / 0.008)
    return vel * tone * attack

def pad(freqs, dur):
    t = np.arange(int(SR * dur)) / SR
    env = np.minimum(1, t / 2.5) * np.minimum(1, (dur - t) / 2.5)
    s = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.2 * t) * 0.3) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for f in freqs)
    return 0.05 * env * s

# Cmaj7, Am9, Fmaj7, G6sus  (MIDI)
chords = [[48, 55, 64, 71], [45, 52, 60, 71], [41, 48, 57, 64], [43, 50, 59, 62]]
melody = [[76, 74, 72, 71], [72, 71, 69, 67], [69, 67, 64, 65], [67, 69, 71, 74]]
bars_per_chord, loops = 2, 3
total = int(SR * BEAT * 4 * bars_per_chord * len(chords) * loops) + SR * 6
L = np.zeros(total); R = np.zeros(total)

def add(sig, at, pan=0.0):
    i = int(at * SR); n = min(len(sig), total - i)
    L[i:i + n] += sig[:n] * (1 - pan) ; R[i:i + n] += sig[:n] * (1 + pan)

t0 = 0.0
for loop in range(loops):
    for ci, ch in enumerate(chords):
        dur = BEAT * 4 * bars_per_chord
        add(pad([note(n) for n in ch[1:]], dur + 2.5), t0)
        for b in range(bars_per_chord * 4):
            hum = rng.normal(0, 0.012)
            if b % 2 == 0:
                add(piano(note(ch[0]), 3.5, 0.28), t0 + b * BEAT + hum, -0.2)
            arp = ch[1 + (b % 3)] + 12
            add(piano(note(arp), 2.5, 0.12 + 0.03 * rng.random()), t0 + b * BEAT + BEAT / 2 + hum, 0.25)
        if loop > 0:
            for k, m in enumerate(melody[ci]):
                add(piano(note(m), 4, 0.2), t0 + k * BEAT * 2 + rng.normal(0, .015), 0.1)
        t0 += dur

# Reverb: convolve with decaying noise.
ir_t = np.arange(int(SR * 2.8)) / SR
for ch in (L, R):
    ir = rng.normal(0, 1, len(ir_t)) * np.exp(-ir_t * 2.2); ir[0] = 0
    wet = np.fft.irfft(np.fft.rfft(ch, len(ch) + len(ir)) * np.fft.rfft(ir, len(ch) + len(ir)))[:len(ch)]
    ch += wet / np.max(np.abs(wet)) * np.max(np.abs(ch)) * 0.45
fade = int(SR * 5); env = np.ones(total); env[-fade:] = np.linspace(1, 0, fade); env[:SR] = np.linspace(0, 1, SR)
st = np.stack([L * env, R * env], 1); st = st / np.max(np.abs(st)) * 0.8
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'demo', 'music'); os.makedirs(out, exist_ok=True)
wav = os.path.join(out, 'ambiente.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-b:a', '128k', os.path.join(out, 'ambiente.mp3')], check=True)
os.remove(wav)
print('ok', round(total / SR), 's')
