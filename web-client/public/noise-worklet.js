// AudioWorkletProcessor for RNNoise neural noise suppression.
//
// Loaded from public/ (not src/): Vite HMR transforms break in AudioWorklet's isolated
// audio-thread scope. Serving from public/ bypasses transforms entirely.
// rnnoise-sync.js is copied here by the Vite plugin in vite.config.ts.
import createRNNWasmModuleSync from '/rnnoise-sync.js';

// RNNoise was trained on 48 kHz data; other rates degrade detection quality.
const FRAME = 480;  // RNNoise requires exactly 480 samples per frame at 48 kHz (10 ms)

// Power-of-2 size replaces slow modulo (%) with fast bitmask (& MASK).
// 1024 is the smallest power-of-2 above the minimum safe size FRAME + 128 = 608.
const FIFO = 1024;
const MASK = FIFO - 1;

// AudioWorkletProcessor: browser-provided base class running in the audio thread
// (separate global scope — no DOM). We override only process(), called ~375×/sec.
// registerProcessor() (bottom) binds this class to a string name so the main thread
// can instantiate it via new AudioWorkletNode(audioCtx, 'noise-processor').
class NoiseProcessor extends AudioWorkletProcessor {
  #mod;        // WASM module instance (holds RNNoise C functions)
  #ctx;        // RNNoise state pointer (opaque C integer)
  #inputPtr;   // byte pointer to input  buffer in WASM heap (FRAME * 4 bytes)
  #outputPtr;  // byte pointer to output buffer in WASM heap (FRAME * 4 bytes)
  #inputBuf = new Float32Array(FRAME); // accumulator until 480 samples ready
  #inputPos = 0;

  // Ring buffer for processed output.
  // AudioWorklet delivers 128-sample blocks, RNNoise needs 480-sample frames —
  // the writer produces 480 samples every ~4 calls while the reader consumes 128 every call.
  // Starting #ringWrite = FRAME ahead of #ringRead gives the reader a 480-sample cushion
  // of silence while waiting for the first WASM frame (~10 ms latency, inaudible).
  #ring = new Float32Array(FIFO); // zero-initialized (the pre-fill silence)
  #ringRead = 0;
  #ringWrite = FRAME;

  constructor() {
    super();
    this.#mod = createRNNWasmModuleSync();
    this.#ctx = this.#mod._rnnoise_create();
    this.#inputPtr = this.#mod._malloc(FRAME * 4);
    this.#outputPtr = this.#mod._malloc(FRAME * 4);

    // port: MessagePort to the main thread. On mic stop, main thread sends any message
    // to trigger WASM cleanup (C heap is not GC-managed).
    this.port.onmessage = () => {
      this.#mod._rnnoise_destroy(this.#ctx);
      this.#mod._free(this.#inputPtr);
      this.#mod._free(this.#outputPtr);
    };
  }

  process(inputs, outputs) {
    // inputs[0][0]  — first channel of our MediaStreamSource, Float32Array of 128 samples.
    // outputs[0][0] — same shape, we must fill it with processed audio.
    // Optional chaining guards against empty arrays during setup/teardown.
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    // HEAPF32: Float32Array view over WASM linear memory. WASM functions use raw byte
    // pointers; >> 2 converts byte offset → float32 index (divides by sizeof(float)).
    const heap = this.#mod.HEAPF32;

    // Accumulate until 480 samples are ready, then run RNNoise.
    // Scale ×32768: RNNoise expects PCM in int16 range (±32768), not float (±1).
    for (let i = 0; i < input.length; i++) {
      this.#inputBuf[this.#inputPos++] = input[i] * 32768;

      if (this.#inputPos === FRAME) {
        // TypedArray.set(): bulk-copy JS array into WASM heap (faster than a loop).
        heap.set(this.#inputBuf, this.#inputPtr >> 2);
        this.#mod._rnnoise_process_frame(this.#ctx, this.#outputPtr, this.#inputPtr);
        const base = this.#outputPtr >> 2;
        for (let j = 0; j < FRAME; j++) {
          this.#ring[this.#ringWrite++ & MASK] = heap[base + j] / 32768;
        }
        this.#inputPos = 0;
      }
    }

    // Drain ring into the output block.
    // #ringRead/#ringWrite are JS numbers (float64, exact up to 2^53). At max throughput
    // they'd need millions of years to lose precision — no overflow. & MASK always maps
    // them into 0–1023 regardless of magnitude.
    for (let i = 0; i < output.length; i++) {
      output[i] = this.#ringRead < this.#ringWrite
        ? this.#ring[this.#ringRead++ & MASK]
        : 0; // underrun guard — only before the first WASM frame arrives
    }

    return true; // false would stop the processor
  }
}

registerProcessor('noise-processor', NoiseProcessor);
