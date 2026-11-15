import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
/** Explicitly requested speech only. No microphone access, recording or automatic playback. */
export function ReadInstruction({ text }: { text: string }) {
  const [supported, setSupported] = useState(false),
    [speaking, setSpeaking] = useState(false);
  const active = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof window.speechSynthesis?.speak === "function" &&
        "SpeechSynthesisUtterance" in window,
    );
  }, []);
  useEffect(
    () => () => {
      if (active.current) {
        active.current.onend = null;
        active.current.onerror = null;
        window.speechSynthesis?.cancel();
        active.current = null;
      }
    },
    [],
  );
  useEffect(() => {
    if (active.current) {
      window.speechSynthesis.cancel();
      active.current = null;
    }
    setSpeaking(false);
  }, [text]);
  if (!supported) return null;
  const read = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      active.current = null;
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.86;
    utterance.pitch = 1.05;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith("en") && v.localService);
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (active.current === utterance) {
        active.current = null;
        setSpeaking(false);
      }
    };
    utterance.onerror = utterance.onend;
    active.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };
  return (
    <button
      type="button"
      className="read-instruction"
      aria-pressed={speaking}
      aria-label={
        speaking ? "Stop reading instruction" : "Read instruction aloud"
      }
      onClick={read}
    >
      {speaking ? <Square size={15} /> : <Volume2 size={17} />}
      <span>{speaking ? "Stop" : "Luma, tell me!"}</span>
    </button>
  );
}
