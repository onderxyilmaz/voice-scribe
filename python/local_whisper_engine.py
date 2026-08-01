import sys
import json
import os
import argparse

# Force UTF-8 stdout for Turkish characters on Windows terminal
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def process_audio(audio_path, model_name="base", language="tr"):
    """
    Local Whisper inference engine using Python.
    Supports faster-whisper or openai-whisper.
    """
    try:
        from faster_whisper import WhisperModel
        # Disable verbose HF warnings
        os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
        
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
        segments, info = model.transcribe(audio_path, language=language, beam_size=5)
        text = " ".join([segment.text for segment in segments]).strip()
        return {"success": True, "text": text, "language": info.language}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Local Whisper Engine for Dikte Windows")
    parser.add_argument("--audio", required=True, help="Path to audio file")
    parser.add_argument("--model", default="base", help="Whisper model (tiny, base, small, medium)")
    parser.add_argument("--lang", default="tr", help="Language code")
    
    args = parser.parse_args()
    
    result = process_audio(args.audio, args.model, args.lang)
    print(json.dumps(result, ensure_ascii=False))
