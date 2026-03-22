import random
import sys
import io
from datetime import date, timedelta

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ── 메뉴 카테고리 ──────────────────────────────────────────────
MENUS = {
    "korean": [
        "제육볶음", "비빔밥", "볶음밥", "김밥", "된장찌개",
        "불고기", "삼겹살", "떡볶이", "즉석떡볶이", "닭갈비", "쌈밥",
    ],
    "soup": [
        "김치찌개", "순대국", "설렁탕", "해장국", "부대찌개",
        "갈비탕", "삼계탕", "육개장", "콩나물국밥", "도다리쑥국",
    ],
    "others": [
        "돈가스", "초밥", "햄버거", "파스타", "피자",
        "라멘", "샌드위치", "샐러드", "볶음면",
    ],
}

# ── 입력 헬퍼 ─────────────────────────────────────────────────
def ask(prompt):
    return input(prompt).strip()

def ask_meals():
    print("\n[1단계] 최근 두 끼를 알려주세요.")
    lunch = ask("  어제 점심 또는 오늘 아침에 뭘 드셨나요? (예: 김치찌개) : ")
    dinner = ask("  마지막으로 드신 끼니는 무엇인가요?             (예: 햄버거) : ")
    return lunch, dinner

def fetch_temperatures():
    """Open-Meteo API로 서울 최근 5일 최저기온 자동 조회 (index 4 = 오늘)"""
    today = date.today()
    start = today - timedelta(days=4)
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude=37.5665&longitude=126.9780"
        f"&daily=temperature_2m_min"
        f"&timezone=Asia%2FSeoul"
        f"&start_date={start}&end_date={today}"
    )
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()
    temps = data["daily"]["temperature_2m_min"]
    dates = data["daily"]["time"]
    print("\n[날씨 자동 조회 완료] 서울 최근 5일 최저기온:")
    for d, t in zip(dates, temps):
        marker = " <- 오늘" if d == str(today) else ""
        print(f"  {d}: {t}°C{marker}")
    return temps

# ── 규칙 판단 ─────────────────────────────────────────────────
def is_korean(meal_name):
    name = meal_name.strip()
    all_korean = MENUS["korean"] + MENUS["soup"]
    return any(m in name or name in m for m in all_korean)

def needs_korean(last_two):
    """최근 두 끼 모두 한식이 아니면 한식 우선 필요"""
    return not any(is_korean(m) for m in last_two)

def is_cold_today(temps):
    """오늘이 5일 중 1위 또는 2위로 추울 때 True"""
    today = temps[-1]
    sorted_temps = sorted(temps)
    return today <= sorted_temps[1]  # 가장 낮거나 두 번째로 낮음

# ── 추천 로직 ─────────────────────────────────────────────────
def recommend(last_two, temps):
    cold = is_cold_today(temps)
    korean_needed = needs_korean(last_two)

    reasons = []

    if cold and korean_needed:
        pool = MENUS["soup"]
        reasons.append("최근 5일 중 오늘이 가장 추운 편이에요. 따뜻한 국물이 딱이죠!")
        reasons.append("게다가 최근 두 끼 모두 한식을 안 드셨네요. 오늘은 한식 한 그릇 어떠세요?")
    elif cold:
        pool = MENUS["soup"]
        reasons.append("최근 5일 중 오늘이 꽤 추운 편이에요. 뜨끈한 국물 요리를 추천드려요!")
    elif korean_needed:
        pool = MENUS["korean"] + MENUS["soup"]
        reasons.append("최근 두 끼 모두 한식이 아니었네요. 오늘은 든든한 한식으로 균형을 맞춰볼까요?")
    else:
        pool = MENUS["korean"] + MENUS["soup"] + MENUS["others"]
        reasons.append("최근 식단도 균형 잡혀 있고 날씨도 나쁘지 않아요. 오늘은 자유롭게 골라봤어요!")

    menu = random.choice(pool)
    return menu, reasons

# ── 출력 ──────────────────────────────────────────────────────
def print_result(menu, reasons, temps):
    today_temp = temps[-1]
    print("\n" + "=" * 45)
    print(f"  오늘의 추천 메뉴: {menu}")
    print("=" * 45)
    print(f"  오늘 기온: {today_temp}°C\n")
    print("  추천 이유:")
    for r in reasons:
        print(f"   - {r}")
    print("=" * 45)
    print(f"  맛있게 드세요! {menu} 한 그릇으로 오늘도 파이팅!")
    print("=" * 45 + "\n")

# ── 메인 ──────────────────────────────────────────────────────
def main():
    print("\n점심 메뉴 추천기에 오신 걸 환영합니다!")
    lunch, dinner = ask_meals()
    temps = fetch_temperatures()
    menu, reasons = recommend([lunch, dinner], temps)
    print_result(menu, reasons, temps)

if __name__ == "__main__":
    main()
