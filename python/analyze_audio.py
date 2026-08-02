import argparse
import json
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def analyze(audio_path, threshold_db=-55.0, min_speech_sec=0.3):
    """
    Measure speech presence using RMS windows (dBFS) via PyAV.
    hasSpeech=True when contiguous-enough energy above threshold_db
    lasts at least min_speech_sec seconds.
    """
    try:
        import av
        import numpy as np
    except Exception as e:
        return {"success": False, "fallback": True, "error": str(e)}

    try:
        container = av.open(audio_path)
        if not container.streams.audio:
            return {
                "success": True,
                "hasSpeech": False,
                "peakDb": -120.0,
                "speechSeconds": 0.0
            }

        stream = container.streams.audio[0]
        sample_rate = stream.rate or 48000
        window = max(1, int(sample_rate * 0.03))  # 30ms
        speech_samples = 0
        peak_rms = 1e-12
        total_samples = 0

        for frame in container.decode(stream):
            arr = frame.to_ndarray()
            if arr.ndim == 2:
                # (channels, samples) -> mono
                arr = arr.mean(axis=0)
            arr = arr.astype('float32').reshape(-1)
            if arr.size == 0:
                continue

            # Normalize integer PCM to roughly [-1, 1]
            max_abs = float(np.max(np.abs(arr))) if arr.size else 0.0
            if max_abs > 1.5:
                arr = arr / 32768.0

            total_samples += arr.size
            for i in range(0, arr.size, window):
                chunk = arr[i:i + window]
                if chunk.size == 0:
                    continue
                rms = float(np.sqrt(np.mean(np.square(chunk))) + 1e-12)
                if rms > peak_rms:
                    peak_rms = rms
                db = 20.0 * np.log10(rms)
                if db >= threshold_db:
                    speech_samples += chunk.size

        speech_seconds = speech_samples / float(sample_rate)
        peak_db = 20.0 * np.log10(peak_rms)
        duration = total_samples / float(sample_rate) if sample_rate else 0.0

        return {
            "success": True,
            "hasSpeech": speech_seconds >= float(min_speech_sec),
            "peakDb": round(float(peak_db), 2),
            "speechSeconds": round(float(speech_seconds), 3),
            "durationSeconds": round(float(duration), 3),
            "thresholdDb": float(threshold_db),
            "minSpeechSec": float(min_speech_sec)
        }
    except Exception as e:
        return {"success": False, "fallback": True, "error": str(e)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='VoiceScribe audio silence analyzer')
    parser.add_argument('--audio', required=True)
    parser.add_argument('--threshold-db', type=float, default=-55.0)
    parser.add_argument('--min-speech-sec', type=float, default=0.3)
    args = parser.parse_args()
    print(json.dumps(analyze(args.audio, args.threshold_db, args.min_speech_sec), ensure_ascii=False))
