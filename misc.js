class Misc {
  static xorState = new Uint32Array([1]);
  static xorShift = (x) => {
    if (x) this.xorState[0] = x;
    this.xorState[0] ^= this.xorState[0] << 13;
    this.xorState[0] ^= this.xorState[0] >>> 17;
    this.xorState[0] ^= this.xorState[0] << 5;
    return this.xorState[0] / 0xffffffff;
  };

  static randSeed = () => Math.ceil(0xfffffffe * Math.random());

  static biquadHigh(data, fs, fc = 1, q = 0.7) {
    const w0 = (2 * Math.PI * fc) / fs;
    const cosW0 = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    const [a0, a1, a2] = [1 + alpha, -2 * cosW0, 1 - alpha];
    const [b0, b1, b2] = [(1 + cosW0) / 2, -1 - cosW0, (1 + cosW0) / 2];
    let [x1, x2, y1, y2] = [0, 0, 0, 0];
    for (let i = 0, l = data.length; i < l; i++) {
      const x = data[i];
      const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      [x1, x2, y1, y2] = [x, x1, y, y1];
      data[i] = y;
    }
  }

  static getNormalizationAmp(buffers, dbTarget) {
    if (dbTarget === undefined) dbTarget = 0;
    else if (isNaN(dbTarget)) return 1;
    const peak = this.#getPeakAmp(buffers);
    const target = Math.min(1, 10 ** (dbTarget / 20));
    return target / peak;
  }

  static #getPeakAmp(buffers) {
    const [peaks, rms] = [[], []];
    for (const [ch, buffer] of buffers.entries()) {
      let [peak, sqSum] = [0, 0];
      for (let i = buffer.length; i--; ) {
        const v = buffer[i];
        peak = peak < v ? v : peak < -v ? -v : peak;
        sqSum += v * v;
      }
      peaks[ch] = peak;
      rms[ch] = 20 * Math.log10((sqSum / buffer.length) ** 0.5);
    }

    console.log("A peak", peaks.map((v) => v.toFixed(3)).join(", "));
    console.log("dB RMS", rms.map((v) => v.toFixed(3)).join(", "));
    return Math.max(...peaks);
  }

  static dynamics(data, fs, normalizeAmp, settings) {
    const setVal = (n, def) => (isNaN(n) ? def : n);
    const dbIn = settings.in || 0;
    const aheadTime = setVal(settings.ahead, 1) * 1e-3;
    const holdTime = setVal(settings.hold, 10) * 1e-3;
    const attackTime = setVal(settings.a, 0.5) * 1e-3;
    const releaseTime = setVal(settings.r, 50) * 1e-3;
    const shape = settings.shape || Math.tanh;

    const aheadLength = Math.floor(aheadTime * fs);
    function lookAhead(i, l, ch) {
      if (i + aheadLength < l) return ch[i + aheadLength];
      else return 0;
    }

    const hDown = 3;
    const hLength = Math.floor(fs * (holdTime / hDown)) || 1;
    const holder = [];
    let hVal, hCount;
    function hold(input, i) {
      if (input <= hVal) {
        hCount = 0;
        return (hVal = input); // reset
      }

      if (i % hDown != 0) return hVal; // down sampling

      holder[hCount++ % hLength] = input;
      if (hCount < hLength) return hVal; // hold

      hVal = holder[0];
      for (let j = 1; j < hLength; j++) {
        const v = holder[j];
        if (v < hVal) hVal = v;
      }
      return hVal; // shift
    }

    // https://www.musicdsp.org/en/latest/Effects/169-compressor.html
    const att = +attackTime == 0 ? 0 : Math.exp(-1 / fs / attackTime);
    const rel = releaseTime == 0 ? 0 : Math.exp(-1 / fs / releaseTime);
    function envelop(gain, target) {
      const theta = target < gain ? att : rel;
      return (1 - theta) * target + theta * gain;
    }

    let gain, shaperGain, holdGain;
    function process(i, l, amp, ch) {
      const input = amp * lookAhead(i, l, ch) || 1e-5;
      shaperGain = shape(input) / input;
      holdGain = hold(shaperGain, i);
      gain = envelop(gain, holdGain);
      return gain;
    }

    const len = data[0].length;
    const amp = normalizeAmp * 10 ** (dbIn / 20);
    for (let ch of data) {
      gain = 1;
      hCount = 0;
      hVal = Infinity;
      for (let i = 0; i < len; i++) ch[i] *= amp * process(i, len, amp, ch);
    }
  }
}
