import random


def build_question_order(question_ids: list[int], mode: str, seed: int | None = None) -> list[int]:
    result = list(question_ids)
    if mode == "random":
        random.Random(seed).shuffle(result)
    return result


def clamp_progress(index: int, question_count: int) -> int:
    if question_count <= 0:
        return 0
    return max(0, min(index, question_count - 1))
