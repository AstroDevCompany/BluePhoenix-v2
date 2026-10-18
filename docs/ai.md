# AI features

BluePhoenix can use an AI model to save you typing. Everything is optional, and you choose where the model runs.

## What it can do

| Feature | Where |
| --- | --- |
| **Generate a commit message** from your changes | Git tab → Commit → Generate |
| **Prioritize to-dos** | To-dos tab → Prioritize with AI |
| **Write a prompt for an AI coding assistant** from a to-do | To-do details → Generate |
| **Generate a changelog**, **summarize changes**, **write a PR description** | Changelog tab |
| **Scan a repository for commands** to import | Add project dialog, or Commands tab → Scan with AI |

AI answers can be wrong. Always glance at a commit message or command before using it.

## Set it up

Open **Settings → AI**.

1. Choose **Local inference** (runs on your computer) or **Cloud provider**.
2. Pick a **provider**.
3. For cloud providers, paste your **API key** and press **Save**. The key goes into your system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service), never into BluePhoenix's own data.
4. Press **Load models** and pick a **model**, or type its name.
5. Press **Test**. A short reply means you are set.

### Local options (nothing leaves your computer)

**Ollama** (easiest)

1. Install it from [ollama.com](https://ollama.com).
2. In a terminal run `ollama pull llama3.2` (or any model you like).
3. In BluePhoenix choose **Local → Ollama**, press **Load models**.

**LM Studio**

1. Install [LM Studio](https://lmstudio.ai), download a model, and open the **Developer** tab.
2. Start the local server (default `http://localhost:1234`).
3. Choose **Local → LM Studio**, press **Load models**.

**llama.cpp with a GGUF file**

1. Install llama.cpp so the `llama-server` command works (on Mac: `brew install llama.cpp`).
2. Choose **Local → llama.cpp (GGUF file)** and press **Choose & start**, then pick your `.gguf` file.
3. Wait a few seconds for the model to load, then press **Test**.

**Other local server:** any program that speaks the OpenAI-compatible API (vLLM, LocalAI, text-generation-webui). Choose **Other local server** and enter its address.

### Cloud providers

OpenAI, Anthropic, OpenRouter, Google Gemini, Groq, Mistral, DeepSeek, xAI, Together AI, or **Other OpenAI-compatible** with your own address. Create an API key on the provider's website and paste it in. Your requests go to that provider and are covered by their terms and pricing.

## Privacy

With a local provider, prompts stay on your computer. With a cloud provider, the relevant text (a diff, to-do titles, commit messages, file names and a few key project files) is sent to that provider when you use a feature. Nothing is sent until you press a button.
