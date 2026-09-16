"use client";

import { useEffect, useRef, useState } from "react";
import * as assistantService from "@/services/assistantService";

const SUGGESTIONS = [
  "شو أرخص سيارة عندكم متوفرة حاليًا؟",
  "بدي أحسب قسط تمويل سيارة بسعر 20000$، دفعة أولى 5000$ على 36 شهر بفايدة 6%",
  "عندي سيارة اشتريتها بـ15000$ سنة 2019 وماشية 60000 كم، قديش ممكن تسوى؟",
];

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "أهلًا! أنا المساعد الذكي لـAutoHub 🚗 بقدر أساعدك تلاقي سيارة مناسبة، تحسب قسط التمويل، أو تقدّر قيمة سيارتك القديمة. شو بتحب تعرف؟",
};

export default function AssistantPage() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      // نبعت بس role وcontent (بدون أي حقول زايدة) عشان يطابق شكل الرسائل اللي
      // الباك اند متوقعها بالضبط
      const payload = nextMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const data = await assistantService.sendMessage(payload);
      setMessages([...nextMessages, { role: "assistant", content: data.message }]);
    } catch (err) {
      setError(err.response?.data?.message || "صار خطأ بالتواصل مع المساعد، جرّب مرة تانية");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">المساعد الذكي</h1>
        <p className="text-gray-500 text-sm">
          اسأل عن السيارات المتوفرة، احسب قسط تمويل، أو قدّر قيمة سيارتك القديمة — كل الأرقام مبنية على بيانات AutoHub الفعلية.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl p-4 space-y-3 mb-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--color-primary)] text-white rounded-tl-sm"
                  : "bg-gray-100 text-gray-800 rounded-tr-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
              جارِ الكتابة...
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="text-xs bg-white border border-gray-300 rounded-full px-3 py-1.5 hover:border-[var(--color-primary)] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك هون..."
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-[var(--color-primary)] text-white rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          إرسال
        </button>
      </form>
    </div>
  );
}
