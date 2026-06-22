from app.services.practice_service import build_question_order, clamp_progress


def test_sequential_order_is_stable():
    assert build_question_order([4, 2, 9], "sequential") == [4, 2, 9]


def test_random_order_contains_same_ids():
    result = build_question_order([1, 2, 3, 4], "random", seed=7)
    assert sorted(result) == [1, 2, 3, 4]
    assert result != [1, 2, 3, 4]


def test_progress_is_clamped_to_available_questions():
    assert clamp_progress(9, 4) == 3
    assert clamp_progress(-2, 4) == 0
    assert clamp_progress(0, 0) == 0
