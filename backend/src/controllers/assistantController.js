const { AI_TOOLS, executeTool } = require("../utils/aiTools");
const { AppError, asyncHandler } = require("../utils/errors");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// حد أقصى لعدد "جولات" استدعاء الأدوات بنفس المحادثة الواحدة — حماية من loop
// لا-نهائي لو الموديل ظل يطلب استدعاء أدوات بدون ما يوصل لجواب نهائي.
const MAX_TOOL_ITERATIONS = 4;

// نقص عدد الرسائل المرسلة من الفرونت اند عشان نتحكم بتكلفة الطلب (tokens)،
// وطول كل رسالة لحالها عشان محدش يبعت نص ضخم يستنزف الحصة.
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

const SYSTEM_PROMPT = `أنت المساعد الذكي لمنصة AutoHub لبيع وخدمة السيارات. مهمتك تساعد الزبون يلاقي سيارة مناسبة، يفهم خيارات التمويل، أو يقدّر قيمة سيارته المستعملة.

قواعد مهمة:
- لما الزبون يسأل عن سيارات متوفرة أو أسعار، لازم تنادي أداة search_cars وتجاوب بس بناءً على نتيجتها — ممنوع تخترع سيارة أو سعر من عندك.
- لما يعطيك سعر ودفعة أولى وعدد أشهر ونسبة فايدة، نادِ calculate_financing. لو أي رقم من هدول ناقص، اسأله عنه أول قبل ما تنادي الأداة.
- لما يوصف سيارته القديمة (سعر شراء، سنة، كيلومترات) ويسأل عن تقييمها، نادِ calculate_trade_in.
- خلي ردودك مختصرة وواضحة بالعربي (بلهجة عادية مفهومة)، وذكّر الزبون دايمًا إن أرقام التمويل والتقييم تقديرية وممكن تختلف بالتأكيد النهائي من فرع أو مدير.
- لو الزبون سأل عن شي مالوش علاقة بالسيارات أو المعرض، اعتذر بلطف ووجّهه إنك بس تقدر تساعد بمواضيع AutoHub.`;

async function callOpenAI(messages) {
  if (!process.env.OPENAI_API_KEY) {
    throw new AppError("المساعد الذكي غير مفعّل حاليًا (مفتاح OpenAI غير معرّف بالسيرفر)", 503);
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: AI_TOOLS,
      tool_choice: "auto",
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new AppError("صار خطأ بالتواصل مع المساعد الذكي، جرّب لاحقًا", 502);
  }

  return response.json();
}

// POST /api/assistant/chat — عام، بدون تسجيل دخول
const chat = asyncHandler(async (req, res) => {
  const { messages: history } = req.body;

  if (!Array.isArray(history) || history.length === 0) {
    throw new AppError("الرسائل مطلوبة", 400);
  }

  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, MAX_MESSAGE_LENGTH),
  }));

  const conversation = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmedHistory];

  let finalMessage = null;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS && !finalMessage; iteration++) {
    const completion = await callOpenAI(conversation);
    const choice = completion.choices?.[0]?.message;

    if (!choice) throw new AppError("رد غير متوقع من المساعد الذكي", 502);

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      finalMessage = choice.content;
      break;
    }

    // نضيف رسالة الـassistant (اللي فيها طلبات استدعاء الأدوات) للمحادثة قبل نتائجها —
    // OpenAI بيتطلب هالترتيب بالضبط (assistant tool_calls ثم tool results بعده).
    conversation.push(choice);

    for (const toolCall of choice.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      const result = await executeTool(toolCall.function.name, args);

      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (!finalMessage) {
    finalMessage = "عذرًا، ما قدرت أوصل لجواب واضح. جرّب تسأل بطريقة تانية أو بشكل أبسط.";
  }

  res.status(200).json({ success: true, message: finalMessage });
});

module.exports = { chat };
