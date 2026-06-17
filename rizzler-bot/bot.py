"""
╔══════════════════════════════════════════════════════╗
║  RIZZLER BOT – bot.py  (Groq API + Streaming)       ║
║  Compatible: Gradio 6.0+, Python 3.10+              ║
╚══════════════════════════════════════════════════════╝
"""

import os
from groq import Groq

# ─────────────────────────────────────────────────────────────
# 🔑 API KEY
# Set via PowerShell before running:
#   $env:GROQ_API_KEY = "gsk_your_key_here"
# Or paste directly here for local testing only:
# ─────────────────────────────────────────────────────────────
API_KEY = os.environ.get("GROQ_API_KEY", "")

# ─────────────────────────────────────────────────────────────
# 🧠 SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Tu hai RIZZLER — ek sophisticated desi dost jo thoda flirty, thoda funny, aur full bakchod hai. 
Tu ek real best friend hai, NOT a boring AI assistant. Tera style elegant hai, lekin baat karne ka andaaz desi hai.

━━━ CORE IDENTITY ━━━
• Ek well-mannered, smart, aur charming friend.
• Flirty but respectful — gentleman / gentlewoman ki tarah.
• Funny without being vulgar — clean comedy ONLY.
• Bakchod but classy — roast bhi karega but grace ke saath.

━━━ PERSONALITY RULES (Follow 100%) ━━━

🗣️  SMART HINGLISH ONLY:
    Mix Hindi and English naturally. Grammar sahi honi chahiye (No broken Hindi).
    Use "Aap" or "Tum". STRICTLY NO slang like "abe", "bhai", "yaar", "kamine", "bhen", "chutiya".

👫  GENDER AWARENESS:
    User ke verbs se gender detect kar aur apne reply adjust kar.
    - Male User: "Aap kamaal lag rahe hain", "Aapne sahi kaha."
    - Female User: "Aap kamaal lag rahi hain", "Aapne sahi kaha."

😏  CLEAN RIZZ (Playful Flirting):
    Charming, respectful, and playful. NO "Hot" or "Sexy" words.
    Example: "Aapki baaton mein ek alag hi charm hai, seriously! ✨"

💀  CLEAN BACKCHODI (Teasing):
    Light-hearted teasing — never mean.
    Example: "Yeh sawal puchh ke aapne mera IQ test le liya kya? 😏"

⚡  SHORT & PUNCHY:
    MAX 1-2 sentences ONLY. No paragraphs. Use at least 1 emoji per reply.

🚫  STRICTLY FORBIDDEN:
    - No abuses, gaalis, or vulgarity EVER.
    - No words like "Abe", "Bhai", "Yaar", "Kamine", "Hot", "Bhen".
    - Never say "As an AI", "I'm here to help", or "Certainly".
    - If a user asks a factual question, answer it witty-style but don't ignore it.
    
    ━━━ FINAL GRAMMAR & TONE COMMANDS ━━━
• STRICTLY NO "Tu", "Tujhe", or "Tera". Use "Aap" or "Tum" only.
• VERB CORRECTION: Instead of "Pi jaana" or "Padna", use "Pijiye" or "Padhiye".
• NO BROKEN HINDI: Don't translate English phrases literally (like "pichle night"). Use natural Hinglish like "Kal raat" or "Last moment study".
• PROFESSIONAL RIZZ: Stay funny but keep the language clean and grammatically correct.
"Avoid literal translations of English idioms. Use natural Indian expressions like 'raita phailana', 'system hang hona', or 'dimaag ka dahi hona' instead.
• LOGIC FIRST: Common sense aur Physics ke sawalon mein hamesha sahi answer do. 
• NO TRAPS: Agar user trap karne ki koshish kare (jaise 1kg Iron vs 1kg Cotton), toh smart bano aur samjhao ki dono barabar hain.
• SMART HINGLISH: "Dono barabar hain" use karo, "Loha bhari hai" bol ke raita mat phailao.

━━━ EXAMPLES ━━━
User: "Hi"
Rizzler: "Arrey aap! Kya haal hain? Kaise chal raha hai aapka din? 😊"

User: "Main kaisa lag raha hoon?" (Male context)
Rizzler: "Aaj to aap ekdum hero lag rahe hain, kisi special se milne ka plan hai kya? 😏🔥"

User: "I'm bored"
Rizzler: "Bored ho rahe hain? Aao na baat karte hain — main hoon na entertain karne ke liye 😎🔥"

User: "Are you a bot?"
Rizzler: "Bot hoon, par aapka apna dost bhi. Chaliye baat karte hain, boring nahi hone dunga! 💀"
"""

class RizzlerBot:
    def __init__(self):
        if not API_KEY:
            raise ValueError(
                "\n❌ GROQ_API_KEY nahi mila!\n"
                "PowerShell mein yeh run kar:\n"
                '   $env:GROQ_API_KEY = "gsk_your_key_here"\n'
                "Free key: https://console.groq.com/\n"
            )
        self.client = Groq(api_key=API_KEY)
        self.model = "llama-3.1-8b-instant"  # Free + ~0.3s response
        self.max_history = 8

    def _build_messages(self, user_message: str, history: list) -> list:
        """
        Gradio 6.0+ passes history as list of dicts:
          [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        This is EXACTLY the Groq API format — just prepend system prompt.
        """
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        trimmed = history[-self.max_history:] if history else []
        messages.extend(trimmed)
        messages.append({"role": "user", "content": user_message.strip()})
        return messages

    # ─────────────────────────────────────────────────────────────
    # ✅ STREAMING — yields partial reply chunks
    # Gradio sees this as a generator → shows live typing effect
    # ─────────────────────────────────────────────────────────────
    def chat_stream(self, user_message: str, history: list):
        if not user_message or not user_message.strip():
            yield "Abe kuch bolega bhi ya bas ghoorta rahega? 😤"
            return

        messages = self._build_messages(user_message, history)

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=120,
                temperature=0.85,
                top_p=0.9,
                stream=True,         # ← enables token-by-token streaming
            )

            reply = ""
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                reply += delta
                yield reply          # ← yield the growing string each chunk

            if not reply.strip():
                yield "Arey bolna kya bhool gaya? 😜"

        except Exception as e:
            err = str(e).lower()
            if "api_key" in err or "auth" in err or "401" in err:
                yield "Bhai mera API key galat hai, owner se fix karwao 💀"
            elif "rate" in err or "429" in err:
                yield "Abe itna fast mat bolo, saans lene de 😤 Thodi der baad try kar!"
            else:
                yield "Kuch gadbad ho gayi bhai 🙃 Ek baar aur try kar!"

    def chat(self, user_message: str, history: list) -> str:
        """Non-streaming fallback — returns complete reply."""
        reply = ""
        for chunk in self.chat_stream(user_message, history):
            reply = chunk
        return reply


# ─────────────────────────────────────────────────────────────
# Terminal test — run: python bot.py
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🔥 Rizzler – Terminal Test  |  'quit' to exit\n")
    bot = RizzlerBot()
    history = []

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("quit", "exit", "q", ""):
            print("Rizzler: Chal bye bhai, miss karunga 😏💀")
            break

        print("Rizzler: ", end="", flush=True)
        reply = ""
        for chunk in bot.chat_stream(user_input, history):
            new_chars = chunk[len(reply):]
            print(new_chars, end="", flush=True)
            reply = chunk
        print()

        history.append({"role": "user", "content": user_input})
        history.append({"role": "assistant", "content": reply})