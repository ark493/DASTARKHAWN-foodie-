import gradio as gr
from bot import RizzlerBot

# ─────────────────────────────────────────────────────────────
# Initialize bot (shared across all sessions)
# ─────────────────────────────────────────────────────────────
bot = RizzlerBot()

# ─────────────────────────────────────────────────────────────
# Custom CSS – desi neon dark theme (unchanged)
# ─────────────────────────────────────────────────────────────
custom_css = """
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Space+Mono:wght@400;700&display=swap');

body, .gradio-container {
    background: #0a0a12 !important;
    font-family: 'Baloo 2', sans-serif !important;
}
.gradio-container {
    max-width: 780px !important;
    margin: 0 auto !important;
}
.rz-header {
    text-align: center;
    padding: 28px 0 8px;
}
.rz-title {
    font-size: 2.6rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
    display: block;
}
.rz-sub {
    font-size: 0.82rem;
    color: #4a4a6a;
    font-family: 'Space Mono', monospace;
    letter-spacing: 0.08em;
}
.rz-badges {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
}
.rz-badge {
    background: #12121e;
    border: 1px solid #2a2a40;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 0.73rem;
    color: #555;
    font-family: 'Space Mono', monospace;
}
.chatbot, #chatbot {
    background: #0f0f1a !important;
    border: 1px solid #1e1e30 !important;
    border-radius: 20px !important;
}
.message-bubble-border[data-testid="user-message"],
.user .bubble-wrap,
[class*="bubble"][class*="user"] {
    background: linear-gradient(135deg, #8338ec, #3a86ff) !important;
    border: none !important;
    border-radius: 18px 18px 4px 18px !important;
}
.message-bubble-border[data-testid="bot-message"],
.bot .bubble-wrap,
[class*="bubble"][class*="bot"] {
    background: #161624 !important;
    border: 1px solid #ff006e28 !important;
    border-radius: 18px 18px 18px 4px !important;
}
.message p, .message span, .message {
    font-family: 'Baloo 2', sans-serif !important;
    font-size: 0.96rem !important;
    line-height: 1.55 !important;
}
.loading .message-bubble-border,
.message.pending {
    border-color: #8338ec44 !important;
    animation: rzPulse 1.4s ease-in-out infinite !important;
}
@keyframes rzPulse {
    0%, 100% { border-color: #8338ec44; box-shadow: none; }
    50%       { border-color: #ff006e88; box-shadow: 0 0 12px #ff006e22; }
}
.svelte-1ipelgc textarea,
.block textarea,
label textarea {
    background: #12121e !important;
    border: 1px solid #2a2a40 !important;
    border-radius: 14px !important;
    color: #e8e8f5 !important;
    font-family: 'Baloo 2', sans-serif !important;
    font-size: 0.98rem !important;
    padding: 12px 16px !important;
    resize: none !important;
    transition: border-color 0.2s, box-shadow 0.2s !important;
}
label textarea:focus {
    border-color: #8338ec !important;
    box-shadow: 0 0 0 3px #8338ec1a !important;
    outline: none !important;
}
label textarea::placeholder {
    color: #383858 !important;
}
.svelte-1ipelgc button[aria-label="Submit"],
button[aria-label="Submit"],
#submit-btn {
    background: linear-gradient(135deg, #ff006e, #8338ec) !important;
    border: none !important;
    border-radius: 12px !important;
    color: #fff !important;
    font-family: 'Baloo 2', sans-serif !important;
    font-weight: 700 !important;
    transition: transform 0.12s, box-shadow 0.2s !important;
    min-width: 80px !important;
}
button[aria-label="Submit"]:hover {
    transform: scale(1.05) !important;
    box-shadow: 0 4px 20px #ff006e44 !important;
}
button[aria-label="Submit"]:active {
    transform: scale(0.96) !important;
}
button[aria-label="Clear"],
.secondary {
    background: #12121e !important;
    border: 1px solid #2a2a40 !important;
    border-radius: 12px !important;
    color: #4a4a6a !important;
    font-family: 'Baloo 2', sans-serif !important;
    transition: all 0.18s !important;
}
button[aria-label="Clear"]:hover,
.secondary:hover {
    border-color: #ff006e !important;
    color: #ff006e !important;
}
.examples-holder table,
.examples table {
    border: none !important;
    background: transparent !important;
}
.examples-holder td button,
.examples td button {
    background: #12121e !important;
    border: 1px solid #2a2a40 !important;
    border-radius: 20px !important;
    color: #5a5a8a !important;
    font-family: 'Baloo 2', sans-serif !important;
    font-size: 0.82rem !important;
    padding: 6px 14px !important;
    transition: all 0.18s !important;
    white-space: nowrap !important;
}
.examples-holder td button:hover,
.examples td button:hover {
    border-color: #8338ec !important;
    color: #c084fc !important;
    background: #1a1228 !important;
}
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: #0a0a12; }
::-webkit-scrollbar-thumb { background: #2a2a40; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #8338ec; }
.avatar-container img {
    border-radius: 50% !important;
    border: 2px solid #8338ec44 !important;
}
"""

# ─────────────────────────────────────────────────────────────
# Example quick‑start messages
# ─────────────────────────────────────────────────────────────
EXAMPLES = [
    ["Kya scene hai bhai? 👀"],
    ["Ek joke suna 🤪"],
    ["Flirt kar mujhse 😏"],
    ["Bored hoon yaar 😴"],
    ["Tu kaun hai?"],
    ["Roast kar mujhe 💀"],
]

# ─────────────────────────────────────────────────────────────
# Chat function (generator for streaming)
# ─────────────────────────────────────────────────────────────
def chat_fn(message: str, history: list):
    """Yields reply tokens one by one – enables live typing effect."""
    yield from bot.chat_stream(message, history)

# ─────────────────────────────────────────────────────────────
# Build Gradio ChatInterface
# ─────────────────────────────────────────────────────────────
demo = gr.ChatInterface(
    fn=chat_fn,
    type="messages",                         # Use dict format for history
    title=None,
    description=None,
    examples=EXAMPLES,
    example_labels=[e[0] for e in EXAMPLES],
    chatbot=gr.Chatbot(
        elem_id="chatbot",
        label="",
        height=460,
        placeholder="<p style='color:#2a2a44; font-family:Space Mono,monospace; font-size:0.85rem;'>Kya scene hai? Bol na... 👀</p>",
        avatar_images=(
            None,
            "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=rizzler&backgroundColor=8338ec&scale=85",
        ),
    ),
    textbox=gr.Textbox(
        placeholder="Bol na bhai, kya chal raha hai... 💬",
        show_label=False,
        submit_btn="🔥 Bhej",
        stop_btn="⏹ Rok",
        autofocus=True,
    ),
    theme=gr.themes.Base(
        primary_hue=gr.themes.colors.purple,
        neutral_hue=gr.themes.colors.slate,
        font=gr.themes.GoogleFont("Baloo 2"),
    ),
    css=custom_css,
    head="""
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Space+Mono&display=swap');
    </style>
    """,
    fill_height=True,
)

# ─────────────────────────────────────────────────────────────
# Inject custom header HTML after building
# ─────────────────────────────────────────────────────────────
with demo:
    gr.HTML("""
        <div class="rz-header">
            <span class="rz-title">⚡ The Rizzler 🤪</span>
            <div class="rz-sub">desi bot · attitude on fleek · always online</div>
            <div class="rz-badges">
                <span class="rz-badge">😏 Rizz</span>
                <span class="rz-badge">💀 Backchodi</span>
                <span class="rz-badge">🤪 Masti</span>
                <span class="rz-badge">🇮🇳 Hinglish</span>
                <span class="rz-badge">⚡ ~0.3s</span>
            </div>
        </div>
    """, render=True)

# ─────────────────────────────────────────────────────────────
# Launch the app
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    demo.launch(
        server_name="127.0.0.1",   # Local – no auto‑reload issues
        server_port=7860,
        share=False,
        show_error=True,
    )