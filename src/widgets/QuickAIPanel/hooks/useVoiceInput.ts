import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;    
  interimText: string;  
  start: () => void;
  stop: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => any = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert('Голосовой ввод доступен только в Chrome / Edge.'); return; }

    setTranscript('');
    setInterimText('');

    const r = new SR();
    r.lang = 'ru-RU';
    r.interimResults = true;
    r.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += text;
        else interim += text;
      }
      if (final) {
        setTranscript(prev => (prev ? prev + ' ' : '') + final);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    r.onerror = () => { setIsListening(false); setInterimText(''); };
    r.onend = () => { setIsListening(false); setInterimText(''); };

    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }, []);

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  return { isListening, transcript, interimText, start, stop };
}
