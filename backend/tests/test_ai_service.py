from types import SimpleNamespace

from app.services.ai_service import build_ai_payload


def test_mimo_payload_disables_thinking_and_caps_completion():
    settings = SimpleNamespace(
        api_base_url="https://token-plan-cn.xiaomimimo.com/v1",
        model_name="mimo-v2.5-pro",
        temperature=0.7,
    )

    payload = build_ai_payload(
        settings,
        "请简洁讲解",
        temperature=0.2,
        max_completion_tokens=320,
        stream=True,
    )

    assert payload["stream"] is True
    assert payload["max_completion_tokens"] == 320
    assert payload["thinking"] == {"type": "disabled"}
