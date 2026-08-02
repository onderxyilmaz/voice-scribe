import React, { useState, useEffect, useRef } from 'react';
import { Mic, CheckCircle2, Sparkles, AlertCircle, X, Loader2 } from 'lucide-react';

export default function FloatingHUD() {
  const [status, setStatus] = useState('idle'); // Initial state is idle, no sound on app start!
  const [duration, setDuration] = useState(0);
  const [cleanText, setCleanText] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const mediaStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const stopBeepPlayedRef = useRef(false);
  const durationRef = useRef(0);

  const getAudioCtx = async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Play light, pleasant Web Audio API chimes (shared resumed context = no delayed beeps)
  const playBeep = async (type) => {
    try {
      const ctx = await getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'stop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.07);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {
      console.error('Audio beep play error:', e);
    }
  };

  useEffect(() => {
    let timer;
    if (status === 'recording') {
      setDuration(0);
      stopBeepPlayedRef.current = false;
      durationRef.current = 0;
      timer = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);

      startAudioCapture();
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (window.api) {
      const unsub = window.api.onRecordingStateChanged((data) => {
        if (data.status === 'processing') {
          if (!stopBeepPlayedRef.current) {
            stopBeepPlayedRef.current = true;
            playBeep('stop');
          }
          stopAudioCapture();
        } else if (data.status === 'success') {
          playBeep('success');
        }
        setStatus(data.status);
        if (data.text) setCleanText(data.text);
      });
      return () => unsub();
    }
  }, []);

  const startAudioCapture = async () => {
    try {
      discardRecordingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          if (discardRecordingRef.current) {
            audioChunksRef.current = [];
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const buffer = await audioBlob.arrayBuffer();

          if (window.api && buffer.byteLength > 0) {
            window.api.sendAudioBuffer(buffer, {
              durationSeconds: durationRef.current
            });
          }
        } finally {
          stream.getTracks().forEach(track => track.stop());
          if (mediaStreamRef.current === stream) {
            mediaStreamRef.current = null;
          }
        }
      };

      mediaRecorder.start();
      // Unlock/resume audio after mic access, then play start chime immediately
      playBeep('start');

      // Audio Visualizer
      const audioContext = await getAudioCtx();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;
          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          ctx.roundRect(x, (height - barHeight) / 2, barWidth - 2, Math.max(barHeight, 4), 2);
          ctx.fill();
          x += barWidth;
        }

        if (status === 'recording') {
          animationFrameRef.current = requestAnimationFrame(drawVisualizer);
        }
      };

      drawVisualizer();

    } catch (e) {
      console.error('Microphone capture error:', e);
      setStatus('error');
    }
  };

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleCancel = () => {
    // Reject any late buffer in main first, then discard locally.
    discardRecordingRef.current = true;
    audioChunksRef.current = [];
    if (!stopBeepPlayedRef.current) {
      stopBeepPlayedRef.current = true;
      playBeep('stop');
    }
    if (window.api) window.api.cancelRecording();
    stopAudioCapture();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setStatus('idle');
    setCleanText('');
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2 select-none">
      <div className={`glass-hud px-4 py-2.5 flex items-center gap-3 transition-all duration-300 ${status === 'recording' ? 'glass-hud-recording' : ''}`}>
        
        {/* Status Indicator / Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 relative">
          {status === 'recording' && (
            <>
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse-recording" />
              <Mic className="w-4 h-4 text-red-400 absolute opacity-0" />
            </>
          )}
          {status === 'transcribing' && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
          {status === 'cleaning' && <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />}
          {status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />}
          {status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
          {status === 'idle' && <Mic className="w-4 h-4 text-indigo-400" />}
        </div>

        {/* Audio Waveform Canvas */}
        {status === 'recording' && (
          <canvas ref={canvasRef} width={64} height={24} className="opacity-90" />
        )}

        {/* Status Text & Timer */}
        <div className="flex flex-col min-w-[120px]">
          <div className="text-xs font-semibold tracking-wide flex items-center gap-1.5">
            {status === 'recording' && <span className="text-red-400">Dinleniyor...</span>}
            {status === 'transcribing' && <span className="text-amber-300">Transkribe ediliyor...</span>}
            {status === 'cleaning' && <span className="text-purple-300">Düzeltiliyor...</span>}
            {status === 'success' && <span className="text-emerald-400">Yapıştırıldı! ✓</span>}
            {status === 'error' && <span className="text-red-400">Hata Oluştu</span>}
            {status === 'idle' && <span className="text-gray-400">Hazır</span>}
          </div>
          
          <div className="text-[10px] text-gray-400 font-mono">
            {status === 'recording' ? formatTime(duration) : (cleanText ? `"${cleanText.substring(0, 20)}..."` : 'Kısayol ile başlatın')}
          </div>
        </div>

        {/* Cancel Action Button */}
        <button
          onClick={handleCancel}
          className="no-drag w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="İptal (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
