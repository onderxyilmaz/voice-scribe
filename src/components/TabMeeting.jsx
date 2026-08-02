import React, { useState, useEffect, useRef } from 'react';
import { Mic, Bot, Sparkles, FileText, Play, Square, Send, Copy, Check } from 'lucide-react';

function formatTimer(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export default function TabMeeting() {
  const [isMeetingRecording, setIsMeetingRecording] = useState(false);
  const [meetingTimer, setMeetingTimer] = useState(0);
  const [meetingBusy, setMeetingBusy] = useState(false);
  const [meetingError, setMeetingError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');

  const [askAiPrompt, setAskAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [copied, setCopied] = useState('');

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const durationRef = useRef(0);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const copyText = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      // ignore
    }
  };

  const startMeeting = async () => {
    setMeetingError('');
    setTranscript('');
    setSummary('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000);

      durationRef.current = 0;
      setMeetingTimer(0);
      setIsMeetingRecording(true);
      timerIntervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setMeetingTimer(durationRef.current);
      }, 1000);
    } catch (e) {
      setMeetingError(e.message || 'Mikrofona erişilemedi.');
    }
  };

  const stopMeeting = async () => {
    if (!mediaRecorderRef.current) return;

    setMeetingBusy(true);
    setMeetingError('');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsMeetingRecording(false);

    const recorder = mediaRecorderRef.current;
    const durationSeconds = durationRef.current;

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      };
      try {
        recorder.stop();
      } catch {
        resolve(new Blob([], { type: 'audio/webm' }));
      }
    });

    stopTracks();
    mediaRecorderRef.current = null;

    if (!blob.size) {
      setMeetingBusy(false);
      setMeetingError('Kayıt boş geldi.');
      return;
    }

    try {
      const buffer = await blob.arrayBuffer();
      if (!window.api?.processMeetingAudio) {
        setMeetingError('Electron API hazır değil.');
        setMeetingBusy(false);
        return;
      }
      const result = await window.api.processMeetingAudio(buffer, { durationSeconds });
      if (!result?.success) {
        setMeetingError(result?.error || 'Toplantı işlenemedi.');
      } else {
        setTranscript(result.transcript || '');
        setSummary(result.summary || '');
        if (result.summaryError) {
          setMeetingError(`Özet için API gerekli: ${result.summaryError}`);
        }
      }
    } catch (e) {
      setMeetingError(e.message || 'Toplantı işleme hatası.');
    } finally {
      setMeetingBusy(false);
    }
  };

  const toggleMeeting = () => {
    if (meetingBusy) return;
    if (isMeetingRecording) stopMeeting();
    else startMeeting();
  };

  const handleAskAi = async () => {
    if (!askAiPrompt.trim() || loadingAi) return;
    setLoadingAi(true);
    setAiError('');
    setAiResponse('');
    try {
      if (!window.api?.askAi) {
        setAiError('Electron API hazır değil.');
        return;
      }
      const result = await window.api.askAi(askAiPrompt.trim());
      if (!result?.success) {
        setAiError(result?.error || 'AI yanıt üretemedi.');
      } else {
        setAiResponse(result.text || '');
      }
    } catch (e) {
      setAiError(e.message || 'AI isteği başarısız.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Toplantı & Yapay Zeka Stüdyosu</h2>
        <p className="text-xs text-gray-400">
          Mikrofonla toplantı kaydı alıp transkript/özet üretin veya yazılı komutla AI asistanını kullanın.
          Özet ve asistan için API &amp; Modeller sekmesinde bir anahtar gerekir.
        </p>
      </div>

      <div className="glass-card p-6 space-y-4 border-indigo-500/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Toplantı Kaydedici</h3>
              <p className="text-xs text-gray-400">Kaydı bitirince STT + (mümkünse) AI özet. Geçmişe de eklenir.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleMeeting}
            disabled={meetingBusy}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 ${
              isMeetingRecording
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {meetingBusy ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" /> İşleniyor…
              </>
            ) : isMeetingRecording ? (
              <>
                <Square className="w-4 h-4" /> Kaydı Durdur ({formatTimer(meetingTimer)})
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Toplantı Başlat
              </>
            )}
          </button>
        </div>

        {isMeetingRecording && (
          <div className="flex items-center gap-2 text-xs text-red-300">
            <Mic className="w-3.5 h-3.5" />
            Kayıt sürüyor — {formatTimer(meetingTimer)}
          </div>
        )}

        {meetingError && (
          <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            {meetingError}
          </div>
        )}

        {(transcript || summary) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {transcript && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-300">Transkript</span>
                  <button
                    type="button"
                    onClick={() => copyText(transcript, 'transcript')}
                    className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1"
                  >
                    {copied === 'transcript' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Kopyala
                  </button>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 text-xs text-gray-200 whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {transcript}
                </div>
              </div>
            )}
            {summary && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-300">Özet</span>
                  <button
                    type="button"
                    onClick={() => copyText(summary, 'summary')}
                    className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1"
                  >
                    {copied === 'summary' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Kopyala
                  </button>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 text-xs text-indigo-100 whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {summary}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Asistanına Sor</h3>
            <p className="text-xs text-gray-400">
              Örn: &quot;Müşteriye nazik bir teşekkür e-postası yaz&quot;. Yanıt panoya da kopyalanır.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Komutunuzu buraya yazın..."
            value={askAiPrompt}
            onChange={(e) => setAskAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskAi();
            }}
            className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
            autoFocus
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleAskAi}
            disabled={loadingAi || !askAiPrompt.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loadingAi ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gönder
          </button>
        </div>

        {aiError && (
          <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            {aiError}
          </div>
        )}

        {aiResponse && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-200">Yanıt (panoya kopyalandı)</span>
              <button
                type="button"
                onClick={() => copyText(aiResponse, 'ai')}
                className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1"
              >
                {copied === 'ai' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Kopyala
              </button>
            </div>
            <div className="p-4 bg-slate-900/90 rounded-xl border border-purple-500/30 text-xs text-purple-100 whitespace-pre-wrap font-mono">
              {aiResponse}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
