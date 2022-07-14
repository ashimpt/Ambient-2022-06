for (const n of Object.getOwnPropertyNames(Math)) self[n] = Math[n];
const st = Date.now();
const logTime = (...arg) => console.log((Date.now() - st) / 1e3, ...arg);

onmessage = (e) => {
  // setup
  importScripts("scores/" + e.data, "pcm-to-wave.js", "misc.js");
  setting.sampleRate = fs;
  setting.duration = dur;
  const chs = setting.numChannels || 2;

  if (setting.seed == "random") setting.seed = 0;
  if (!isNaN(parseInt(setting.seed))) {
    random = Misc.xorShift;
    if (setting.seed === 0) setting.seed = Misc.randSeed();
    random(setting.seed);
  }

  logTime("importScripts");

  // render
  const chData = new Array(chs).fill(0).map(() => new Float64Array(fs * dur));
  render(chData);
  logTime("render");

  // misc
  if (setting.hzLowCut > 0) {
    for (let ch of chData)
      Misc.biquadHigh(ch, fs, setting.hzLowCut, setting.qLowCut);
  }
  if (setting.dynamics) {
    const amp = Misc.getNormalizationAmp(chData, 0);
    Misc.dynamics(chData, fs, amp, setting.dynamics);
    console.log("dynamics");
  }

  setting.amplifier = Misc.getNormalizationAmp(chData, setting.dbPeak);

  // pcm-to-wave
  const pcmToWave = new PcmToWave(setting);
  const uint8Array = pcmToWave.convert(chData);

  setting.scoreUrl = e.data;
  postMessage(JSON.parse(JSON.stringify(setting)));
  postMessage(uint8Array, [uint8Array.buffer]);
  logTime("postMessage");
};
