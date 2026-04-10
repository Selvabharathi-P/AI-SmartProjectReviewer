from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from app.core.config import settings

_client = MistralClient(api_key=settings.MISTRAL_API_KEY)


def chat(prompt: str, system: str = "You are an expert academic project evaluator.") -> str:
    messages = [
        ChatMessage(role="system", content=system),
        ChatMessage(role="user", content=prompt),
    ]
    response = _client.chat(model=settings.MISTRAL_MODEL, messages=messages)
    return response.choices[0].message.content.strip()
