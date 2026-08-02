import sys
import json
import os
import argparse

# Force UTF-8 stdout for Turkish characters on Windows terminal
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def process_audio(audio_path, model_name="small", language="tr", model_dir=None, initial_prompt=None):
    """
    Local Whisper inference engine using faster-whisper.
    Tuned for short Turkish dictation clips (VAD + greedy-stable decode).
    """
    try:
        from faster_whisper import WhisperModel
        # Disable verbose HF warnings
        os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

        kwargs = {
            "device": "cpu",
            "compute_type": "int8",
        }
        if model_dir:
            kwargs["download_root"] = model_dir

        model = WhisperModel(model_name, **kwargs)

        # Quality-focused defaults for short TR utterances:
        # - vad_filter: drop silence / keyboard noise before decode
        # - condition_on_previous_text=False: less hallucinated carry-over on short clips
        # - temperature=0: deterministic first pass
        # - no_speech_threshold: reject near-empty noise as "speech"
        transcribe_kwargs = {
            "language": language,
            "beam_size": 5,
            "patience": 1.0,
            # First pass greedy; fallback temperatures if compression/logprob filters fail
            "temperature": [0.0, 0.2, 0.4],
            "vad_filter": True,
            "vad_parameters": {
                "min_silence_duration_ms": 400,
                "speech_pad_ms": 200,
            },
            "condition_on_previous_text": False,
            "no_speech_threshold": 0.6,
            "compression_ratio_threshold": 2.4,
            "log_prob_threshold": -1.0,
        }
        if initial_prompt:
            transcribe_kwargs["initial_prompt"] = initial_prompt

        segments, info = model.transcribe(audio_path, **transcribe_kwargs)
        text = " ".join([segment.text for segment in segments]).strip()
        return {"success": True, "text": text, "language": info.language}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Local Whisper Engine for VoiceScribe")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--model", default="small", help="Whisper model (tiny, base, small, medium)")
    parser.add_argument("--lang", default="tr", help="Language code")
    parser.add_argument("--model-dir", default="", help="Optional model download/cache directory")
    parser.add_argument("--initial-prompt", default="", help="Optional Whisper bias prompt (action triggers, vocab)")

    args = parser.parse_args()
    model_dir = args.model_dir.strip() or None
    initial_prompt = args.initial_prompt.strip() or None

    result = process_audio(args.audio, args.model, args.lang, model_dir, initial_prompt)
    print(json.dumps(result, ensure_ascii=False))
