# Ambient-2022-06
experimental music with non-real-time DSP
## simpler player
```js
const [fs, dur] = [6e3, 3 * 60];
function render(data) {
  const am = (x, e = 1) => 0.5 - 0.5 * cos(2 * PI * (x % 1) ** e);
  function syn(i, t, j, k, f0, pan) {
    const n = 4.5 * am((6 / f0) * t) + 3 * am(t / (33 + 3 * j) + j / 3, 16);
    const fc = f0 * 2 ** (floor((2 - j / 6) * floor(n)) / 5);
    const p = 2 * PI * fc * t + am(t / (f0 / 9), 8) * sin((fc / 16) * t);
    const b = (88 / fc) * am(n, k) * sin(p + (222 / fc) * am(n, 4) * sin(p));
    for (let ch = 2; ch--; ) data[ch][i] += sin(1.57 * ch ? pan : 1 - pan) * b;
  }
  for (let i = 0, t = 0; t < dur; t = ++i / fs) {
    for (let j = 4; j--; ) syn(i, t, j, 1.4 ** j, 200 * 2 ** (j / 5), j / 3);
    for (let ch = 2; ch--; ) data[ch][i] += 0.6 * data[ch ^ 1].at(i - fs / 3);
    for (let ch = 2; ch--; ) data[ch][i] *= min(1, (dur - t) / 30) ** 2;
  }
}
if (!confirm("start rendering")) throw new Error();
for (const n of Object.getOwnPropertyNames(Math)) self[n] = Math[n];
const ctx = new AudioContext();
const source = ctx.createBufferSource();
source.buffer = ctx.createBuffer(2, fs * dur, fs);
render([0, 1].map((v) => source.buffer.getChannelData(v)));
source.connect(ctx.destination);
source.start();
```
## audio
[SoundCloud](https://soundcloud.com/hjaxjtdhdy/202112-202206a)