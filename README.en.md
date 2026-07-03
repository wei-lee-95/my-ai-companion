# My AI Companion

[中文版](README.md)

An AI-powered mobile companion app where users create a personalized virtual character, interact through text, image, voice, and video, and build shared memories with a character that has appearance, voice, personality, and relationship state.

My AI Companion combines a React Native mobile app, Flask backend, SQLite data layer, and multiple AI services into one interactive companion experience. The system is designed around one idea: a virtual character should be able to see, understand, remember, and respond in ways that feel continuous.

## Demo Video

[![Watch the demo](docs/images/demo-thumbnail.png)](https://youtu.be/j00EK6wsBXM)

## Project Overview

My AI Companion is not only a text chatbot. It connects character creation, interaction, memory, and multimodal responses into a complete mobile flow:

- Set up character background, relationship, personality, and speaking style
- Generate character appearance from user-provided references and selected style
- Train or apply a character voice model for personalized voice responses
- Generate LLM responses based on character state, relationship progress, and chat history
- Convert important conversations into categorized memory records
- Extend interaction from text into voice, expression, and video responses

## Features

### Character Creation & Role Switching

Users can define a character's relationship, gender, name, background, personality, preference, speaking style, and interaction context. The flow also supports appearance generation, voice setup, and switching between multiple created characters.

![Character Creation Flow](docs/images/character-creation-flow-en.png)

### Chat Room & Memory Store

The chat room supports text, voice, and image input. Character replies are generated based on profile data, relationship stage, emotion value, affection value, and chat history, making the interaction feel more continuous than a single-turn chatbot.

Important conversations can be saved as memories, organized by category and time. Users can also manually collect meaningful messages or special moments into the memory store.

![Chat Flow](docs/images/chat-flow-en.png)

### Context-Aware Video Interaction

Video interaction combines environment recognition, emotion sensing, and animated character responses. The system can use visual context, user emotion, and character state to generate a more situational response with expression and lip-sync animation.

![Video Interaction Flow](docs/images/video-flow-en.png)

## Architecture

![Architecture Diagram 1](docs/images/flow-chart-1-en.png)

![Architecture Diagram 2](docs/images/flow-chart-2-en.png)

![Architecture Diagram 3](docs/images/flow-chart-3-en.png)

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | JavaScript, React Native, Expo | Mobile app UI |
| Backend | Python, Flask | API orchestration |
| Database | SQLite | User, character, memory data |
| LLM | OpenAI API | Chat, memory, image understanding |
| Speech | Whisper, Edge-TTS, RVC | STT and character voice |
| Image | Stable Diffusion, ControlNet | Character image generation |
| Vision | YOLOv8, MediaPipe Face Mesh | Object and emotion detection |
| Animation | Expression Editor, Ditto TalkingHead | Emotion image and lip-sync video |

![Tech Stack](docs/images/Tech-Stack-image-en.png)

## My Contributions

- Designed and integrated the character generation pipeline by evaluating multiple open-source image generation models, including Stable Diffusion, ControlNet, and IP-Adapter, to achieve consistent character appearance.

- Built the character voice generation workflow by integrating TTS and RVC, and optimized inference performance by deploying GPU-intensive services on Google Colab.

- Evaluated and compared multiple AI frameworks and deployment approaches (e.g., Applio, Hugging Face, Colab, and ngrok) to identify solutions suitable for real-time interaction.

- Integrated backend APIs across the character generation and video interaction modules, enabling end-to-end communication between multiple AI services.

- Performed system integration testing and resolved dependency conflicts across multiple AI frameworks and open-source projects to improve system stability.

## Engineering Challenges

- Evaluated multiple open-source AI models before selecting the final character generation pipeline.

- Migrated GPU-intensive inference from local execution to Google Colab to improve development efficiency.

- Resolved dependency conflicts among several AI frameworks and deployment environments.

- Designed an end-to-end workflow connecting image generation, voice synthesis, and video interaction modules.

## Additional Materials

- [System Overview Document](https://drive.google.com/file/d/11oNMockcvHzXk7IYgOMrWCdFwy6_FTJW/view?usp=sharing)
- [Competition Presentation](https://canva.link/fur6fwjiaquxvjs)
