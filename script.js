// ═══════════════════════════════════════════════════════════════
//  이미지 소스: Wikipedia API
// ═══════════════════════════════════════════════════════════════

const MENUS = [
    // ── 한식 ──
    { name: "김치찌개", cuisine: "한식", tags: ["혼밥", "회식", "가성비"], weather: ["추움", "비/눈", "흐림"], wikiTitle: "Kimchi-jjigae" },
    { name: "된장찌개", cuisine: "한식", tags: ["혼밥", "가성비"], weather: ["추움", "흐림"], wikiTitle: "Doenjang-jjigae" },
    { name: "순대국", cuisine: "한식", tags: ["혼밥", "해장", "가성비"], weather: ["추움", "흐림"], wikiTitle: "Sundae (Korean food)" },
    { name: "설렁탕", cuisine: "한식", tags: ["혼밥", "해장"], weather: ["추움"], wikiTitle: "Seolleongtang" },
    { name: "삼계탕", cuisine: "한식", tags: ["혼밥", "데이트", "기력보충"], weather: ["추움", "더움", "비/눈"], wikiTitle: "Samgyetang" },
    { name: "콩나물국밥", cuisine: "한식", tags: ["혼밥", "해장", "가성비"], weather: ["추움", "흐림", "비/눈"], wikiTitle: "Kongnamul-gukbap" },
    { name: "비빔밥", cuisine: "한식", tags: ["혼밥", "가벼운"], weather: ["맑음"], wikiTitle: "Bibimbap" },
    { name: "김밥", cuisine: "한식", tags: ["혼밥", "가성비", "가벼운"], weather: ["맑음"], wikiTitle: "Gimbap" },
    { name: "쌈밥", cuisine: "한식", tags: ["혼밥", "가벼운"], weather: ["맑음"], wikiTitle: "Ssambap" },
    // ── 일식 ──
    { name: "초밥", cuisine: "일식", tags: ["데이트", "회식", "가벼운"], weather: ["맑음"], wikiTitle: "Sushi" },
    { name: "라멘", cuisine: "일식", tags: ["혼밥", "해장"], weather: ["추움", "비/눈"], wikiTitle: "Ramen" },
    { name: "우동", cuisine: "일식", tags: ["혼밥", "가성비"], weather: ["추움", "흐림"], wikiTitle: "Udon" },
    { name: "소바", cuisine: "일식", tags: ["혼밥", "가벼운"], weather: ["맑음", "더움"], wikiTitle: "Soba" },
    // ── 중식 ──
    { name: "짜장면", cuisine: "중식", tags: ["혼밥", "가성비"], weather: ["비/눈", "흐림"], wikiTitle: "Jajangmyeon" },
    { name: "짬뽕", cuisine: "중식", tags: ["혼밥", "해장"], weather: ["추움", "비/눈"], wikiTitle: "Jjamppong" },
    { name: "마파두부", cuisine: "중식", tags: ["혼밥", "가성비"], weather: ["추움", "흐림"], wikiTitle: "Mapo tofu" },
    // ── 양식 ──
    { name: "샐러드", cuisine: "양식", tags: ["가벼운", "혼밥"], weather: ["더움", "맑음"], wikiTitle: "Salad" },
    { name: "샌드위치", cuisine: "양식", tags: ["혼밥", "가벼운", "가성비"], weather: ["맑음"], wikiTitle: "Sandwich" },
    // ── 아시안 ──
    { name: "쌀국수", cuisine: "아시안", tags: ["혼밥", "해장", "가벼운"], weather: ["추움", "비/눈"], wikiTitle: "Phở" },
];

// ── Wikipedia 이미지 가져오기 ──
async function fetchFromWiki(lang, title) {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.originalimage?.source || data.thumbnail?.source || null;
}

async function fetchWikiImage(koName, enTitle) {
    const koSrc = await fetchFromWiki("ko", koName).catch(() => null);
    if (koSrc) return koSrc;
    if (enTitle) {
        const enSrc = await fetchFromWiki("en", enTitle).catch(() => null);
        if (enSrc) return enSrc;
    }
    return null;
}

async function getCachedWikiImage(koName, enTitle) {
    const key = `wiki:${enTitle || koName}`;
    const cached = sessionStorage.getItem(key);
    if (cached !== null) return cached === "__none__" ? null : cached;
    const src = await fetchWikiImage(koName, enTitle);
    sessionStorage.setItem(key, src ?? "__none__");
    return src;
}

// ── 카드 이미지 로드 ──
async function loadCardImage(cardId) {
    const img = document.getElementById(`img-${cardId}`);
    const fallback = document.getElementById(`fallback-${cardId}`);
    if (!img) return;

    const koName = img.dataset.name;
    const enTitle = img.dataset.wiki || "";

    try {
        const src = await getCachedWikiImage(koName, enTitle);
        if (src) {
            img.src = src;
            img.style.opacity = "1";
        } else {
            img.style.display = "none";
            if (fallback) fallback.style.display = "flex";
        }
    } catch (e) {
        img.style.display = "none";
        if (fallback) fallback.style.display = "flex";
    }
}

// ── 네이버 지도 검색 (지도 우선 뷰) ──
function searchNaverMap(menuName) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            const mapUrl = `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(menuName)}&sm=hty&style=v5&center=${lng}%2C${lat}`;
            window.open(mapUrl, '_blank');
        }, () => {
            window.open(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(menuName)}&sm=hty&style=v5`, '_blank');
        });
    }
}

// ── 날씨 조회 (안전장치 추가 버전) ──
async function fetchWeather() {
    let lat = 37.5665;
    let lng = 126.9780;

    try {
        const coords = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject(new Error("Geolocation 지원 안 함"));
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { timeout: 5000 }
            );
        }).catch(err => {
            console.warn("위치 정보를 가져올 수 없어 서울 좌표를 사용합니다:", err.message);
            return { lat, lng };
        });

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true&daily=temperature_2m_mean&past_days=7&timezone=auto`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("네트워크 응답 에러");
        const data = await res.json();

        const currentTemp = data.current_weather.temperature;
        const weatherCode = data.current_weather.weathercode;
        const pastTemps = data.daily.temperature_2m_mean.slice(0, 7);
        const validTemps = pastTemps.filter(t => t !== null && t !== undefined);
        const avgTemp = validTemps.length > 0
            ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length
            : currentTemp;
        const isSuddenCold = (avgTemp - currentTemp) >= 5;

        let label = "맑음";
        if ([51,53,55,61,63,65,71,73,75,77,80,81,82,85,86].includes(weatherCode)) label = "비/눈";
        else if (isSuddenCold) label = "급추움";
        else if (currentTemp <= 5) label = "추움";
        else if (currentTemp >= 28) label = "더움";
        else if ([1,2,3,45,48].includes(weatherCode)) label = "흐림";

        return { todayTemp: currentTemp, avgTemp, weatherLabel: label, isCold: currentTemp <= 5 || isSuddenCold };
    } catch (e) {
        console.error("날씨 로드 최종 실패:", e);
        return { todayTemp: 15, avgTemp: 15, weatherLabel: "맑음", isCold: false };
    }
}

// ── 추천 로직 ──
function pickMenus(weatherLabel, mealHistory, tag) {
    let pool;
    if (weatherLabel === "급추움") {
        const soupKeywords = ["찌개", "국", "탕", "라멘", "우동", "짬뽕", "훠궈", "나베", "칼국수", "수제비", "쌀국수"];
        pool = MENUS.filter(m => soupKeywords.some(key => m.name.includes(key)));
    } else {
        pool = MENUS.filter(m => m.weather.includes(weatherLabel));
    }
    if (tag && tag !== "전체") pool = pool.filter(m => m.tags.includes(tag));
    pool = pool.filter(m => !mealHistory.includes(m.name));
    if (pool.length < 3) pool = [...MENUS];
    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
}

// ── UI 초기화 및 이벤트 ──
const weatherEl = document.getElementById("weather-info");
const resultsEl = document.getElementById("results");
const btn = document.getElementById("recommend-btn");
let weatherData = null;

async function init() {
    weatherEl.innerHTML = "날씨 정보를 불러오는 중입니다...";
    weatherData = await fetchWeather();
    const avgStr = (weatherData && weatherData.avgTemp != null)
        ? ` · 7일 평균 ${weatherData.avgTemp.toFixed(1)}°C`
        : "";
    weatherEl.innerHTML = `현재 기온: <strong>${weatherData.todayTemp}°C</strong> (${weatherData.weatherLabel})${avgStr}`;
}

btn.addEventListener("click", () => {
    const audio = new Audio('https://get-selection.com/assets/sounds/bell.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => {
        console.error("소리 재생 최종 실패:", e.name, e.message);
    });

    const mealHistory = [document.getElementById("meal1").value, document.getElementById("meal2").value].filter(Boolean);
    const tag = document.getElementById("tag").value;
    const picks = pickMenus(weatherData.weatherLabel, mealHistory, tag);

    resultsEl.innerHTML = picks.map((m, idx) => `
        <div class="card" onclick="searchNaverMap('${m.name}')">
            <div class="img-wrap">
                <img id="img-${idx}" class="card-img" data-name="${m.name}" data-wiki="${m.wikiTitle || ''}" src="">
                <div id="fallback-${idx}" class="img-fallback" style="display:none;">${m.name}</div>
                <div class="img-overlay">
                    <span class="overlay-name">${m.name}</span>
                    <span class="overlay-hint">📍 주변 맛집 보기</span>
                </div>
            </div>
            <div class="card-body">
                <h3>${m.name}</h3>
                <span class="badge cuisine">${m.cuisine}</span>
                ${m.tags.map(t => `<span class="badge tag">${t}</span>`).join("")}
            </div>
        </div>
    `).join("");

    picks.forEach((_, idx) => loadCardImage(idx));
});

init();
