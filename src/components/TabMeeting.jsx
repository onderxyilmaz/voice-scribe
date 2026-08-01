import React, { useState } from 'react';
import { Mic, Bot, Sparkles, FileText, Play, Square, Send } from 'lucide-react';

export default function TabMeeting() {
  const [isMeetingRecording, setIsMeetingRecording] = useState(false);
  const [meetingTimer, setMeetingTimer] = useState(0);
  const [askAiPrompt, setAskAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const toggleMeeting = () => {
    setIsMeetingRecording(!isMeetingRecording);
  };

  const handleAskAi = () => {
    if (!askAiPrompt.trim()) return;
    setLoadingAi(true);
    setTimeout(() => {
      setAiResponse(`AI Yanıtı (${askAiPrompt}):\n\nSesli komutunuz başarıyla işlendi. İlgili e-posta taslağı veya özet hazırlandı ve panoya kopyalandı.`);
      setLoadingAi(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Toplantı & Yapay Zeka Stüdyosu</h2>
        <p className="text-xs text-gray-400">Uzun süreli toplantıları kaydedip transkribe edin veya sesinizle AI ajanı çalıştırın.</p>
      </div>

      {/* Meeting Recorder Card */}
      <div className="glass-card p-6 space-y-4 border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Toplantı Kaydedici (Meeting Studio)</h3>
              <p className="text-xs text-gray-400">Toplantıları kesintisiz kaydedin, otomatik özet ve altyazı oluşturun.</p>
            </div>
          </div>

          <button
            onClick={toggleMeeting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              isMeetingRecording
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isMeetingRecording ? (
              <>
                <Square className="w-4 h-4" /> Kaydı Durdur (00:14)
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Toplantı Başlat
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ask AI Agent Voice Mode */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Asistanına Sesle Soru Sor</h3>
            <p className="text-xs text-gray-400">Sesli bir komut verin (Örn: "Müşteriye nazik bir teşekkür e-postası yaz").</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Veya komutunuzu buraya yazın..."
            value={askAiPrompt}
            onChange={(e) => setAskAiPrompt(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAskAi}
            disabled={loadingAi}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loadingAi ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gönder
          </button>
        </div>

        {aiResponse && (
          <div className="p-4 bg-slate-900/90 rounded-xl border border-purple-500/30 text-xs text-purple-200 whitespace-pre-wrap font-mono">
            {aiResponse}
          </div>
        )}
      </div>
    </div>
  );
}
