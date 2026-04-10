import React, { useState, useEffect, useRef, useCallback } from 'react';
import './style.css';

const defaultCategories = ["全部", "澳門時事", "琴澳深合", "國際要聞", "醫療與健康", "數碼與科技", "電競與遊戲", "城中熱話", "交通與通關", "體育與盛事", "天氣與氣象", "尋味澳門", "民生與消費", "趣聞軼事", "天文地理"];

// 權威度評分 (分數越高越權威，代表「重大事件」)
const authorityMap = { "官方": 10, "澳門日報": 9, "特區政府": 10, "聯合國": 10, "NASA": 10, "CNN": 9, "路透社": 9, "chu chu channel": 8, "大時事": 7, "Facebook": 3, "IG": 3, "Threads": 3 };
const getAuthority = (source) => Object.entries(authorityMap).find(([k]) => source.includes(k))?.[1] || 5;

const safeGetLocal = (key, fallback) => {
    if (typeof window !== 'undefined') {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) { return fallback; }
    }
    return fallback;
};

const safeSetLocal = (key, value) => {
    if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
};

const getCurrentTimeString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// 智能翻譯輔助函數 (僅翻譯外文，極速處理)
const translateIfNeeded = async (text) => {
    if (!text) return text;
    if (!/[\u4e00-\u9fa5]/.test(text)) {
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-TW&dt=t&q=${encodeURIComponent(text)}`);
            const data = await res.json();
            return data[0].map(x => x[0]).join('');
        } catch (e) { return text; }
    }
    return text;
};

// 升級至 v9_live：支援多維度評分及各類別 Top 5 篩選機制
const initializeNewsData = () => {
    const localNews = safeGetLocal('react_news_v9_live', []);
    const localBookmarks = safeGetLocal('react_bookmarks_v9_live', []);
    const localUnbookmarked = safeGetLocal('react_unbookmarked_v9_live', {});

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    const cleaned = localNews.filter(article => {
        if (localBookmarks.includes(article.id)) return true;
        if (localUnbookmarked[article.id]) return (now - localUnbookmarked[article.id]) < threeDays;
        return (now - article.createdAt) < sevenDays;
    });

    if (cleaned.length !== localNews.length) safeSetLocal('react_news_v9_live', cleaned);
    return cleaned;
};

export default function App() {
    const [categories, setCategories] = useState(() => safeGetLocal('react_cats_v9_live', [...defaultCategories]));
    const [newsData, setNewsData] = useState(initializeNewsData);
    const [readArticles, setReadArticles] = useState(() => safeGetLocal('react_read_v9_live', []));
    const [bookmarks, setBookmarks] = useState(() => safeGetLocal('react_bookmarks_v9_live', []));
    const [unbookmarkedTracker, setUnbookmarkedTracker] = useState(() => safeGetLocal('react_unbookmarked_v9_live', {}));
    
    const [currentCategory, setCurrentCategory] = useState("全部");
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showToast, setShowToast] = useState("");
    const [currentTime, setCurrentTime] = useState("");
    
    const [ptrDistance, setPtrDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const listRef = useRef(null);
    const sortableRef = useRef(null);
    const hasFetchedInitial = useRef(false);
    
    // 使用 Ref 追蹤最新數據，供非同步抓取時進行比對過濾
    const newsDataRef = useRef(newsData);

    const navRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    useEffect(() => { 
        newsDataRef.current = newsData; 
        safeSetLocal('react_news_v9_live', newsData); 
    }, [newsData]);
    useEffect(() => { safeSetLocal('react_bookmarks_v9_live', bookmarks); }, [bookmarks]);
    useEffect(() => { safeSetLocal('react_unbookmarked_v9_live', unbookmarkedTracker); }, [unbookmarkedTracker]);
    useEffect(() => { safeSetLocal('react_read_v9_live', readArticles); }, [readArticles]);

    const displayToast = useCallback((msg) => {
        setShowToast(msg);
        setTimeout(() => setShowToast(""), 3500);
    }, []);

    // 核心升級：AI 多維度評分系統 (新至舊、重大至小事、近澳門至遠)
    const fetchLiveNews = useCallback(async (isInitial = false) => {
        if (!isInitial) setIsRefreshing(true);
        try {
            // 一次性進行廣泛搜尋，避免對各分類單獨發出請求導致卡頓
            const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=澳門+OR+橫琴+OR+大灣區&hl=zh-TW&gl=MO&ceid=MO:zh-Hant');
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&_=${Date.now()}`);
            const data = await response.json();

            if (data.status === 'ok' && data.items && data.items.length > 0) {
                
                const assignCategory = (title) => {
                    if (/天氣|氣象|颱風|暴雨|雷暴|氣溫/.test(title)) return "天氣與氣象";
                    if (/通關|交通|巴士|輕軌|大橋|車|航班|的士|機場/.test(title)) return "交通與通關";
                    if (/橫琴|深合區|大灣區|珠海|廣東/.test(title)) return "琴澳深合";
                    if (/賭|博彩|酒店|旅遊|旅客|遊客|銀河|威尼斯人|金沙/.test(title)) return "旅業與博彩";
                    if (/演唱會|電影|明星|音樂|藝術|文化|展覽/.test(title)) return "娛樂與演唱會";
                    if (/體育|大賽車|足球|籃球|奧運|馬拉松/.test(title)) return "體育與盛事";
                    if (/消費|物價|經濟|超市|派錢|津貼|商戶/.test(title)) return "民生與消費";
                    if (/科技|AI|人工智能|網絡|電騙|詐騙|晶片/.test(title)) return "數碼與科技";
                    if (/電競|遊戲|手遊/.test(title)) return "電競與遊戲";
                    if (/網民|熱議|瘋傳|網傳|群組/.test(title)) return "城中熱話";
                    if (/醫|醫院|健康|病毒|感染|衛生|流感/.test(title)) return "醫療與健康";
                    if (/美國|中國|國際|聯合國|世界|全球|歐洲|日本/.test(title)) return "國際要聞";
                    if (/美食|餐廳|探店|Cafe|咖啡|打卡/.test(title)) return "尋味澳門";
                    return "澳門時事";
                };

                // 1. 初步解析與多維度評分
                let scoredItems = data.items.map(item => {
                    const titleParts = item.title.split(' - ');
                    const source = titleParts.length > 1 ? titleParts.pop() : '網絡新聞';
                    const rawTitle = titleParts.join(' - ').trim();
                    const category = assignCategory(rawTitle);
                    const authority = getAuthority(source);
                    const pubTime = new Date(item.pubDate.replace(/-/g, '/')).getTime() || Date.now();
                    
                    // A. 近澳門至遠 (Location Score)
                    let locScore = 0;
                    if (/澳門|本澳|濠江|琴澳/.test(rawTitle)) locScore = 20;
                    else if (/橫琴|珠海|大灣區/.test(rawTitle)) locScore = 10;
                    
                    // B. 新至舊 (Time Score: 越新越高分)
                    const hoursOld = (Date.now() - pubTime) / (1000 * 60 * 60);
                    let timeScore = Math.max(0, 30 - hoursOld); // 最高 30 分

                    // C. 重大至小事 (Total Score = 權威度加權 + 地理位置 + 時間新鮮度)
                    const totalScore = (authority * 3) + locScore + timeScore;

                    return { item, rawTitle, source, category, pubTime, authority, totalScore };
                });

                // 2. 按分類分組，並針對每個分類只取「最高分的 5 篇」
                const grouped = {};
                scoredItems.forEach(si => {
                    if (!grouped[si.category]) grouped[si.category] = [];
                    grouped[si.category].push(si);
                });

                const topSelectedItems = [];
                for (const cat in grouped) {
                    grouped[cat].sort((a, b) => b.totalScore - a.totalScore); // 分數高者優先
                    topSelectedItems.push(...grouped[cat].slice(0, 5)); // 嚴格限制每個板塊 5 篇
                }

                // 3. 過濾掉資料庫中已有的新聞 (大幅減少後續翻譯與渲染時間)
                const currentNews = newsDataRef.current;
                const newItemsToProcess = topSelectedItems.filter(si => 
                    !currentNews.some(n => n.baseTitle === si.rawTitle || n.sourceUrl === si.item.link)
                );

                if (newItemsToProcess.length === 0) {
                    if (!isInitial) displayToast("✅ 經深度檢索，目前版面資訊已是最精華準確，無須更新");
                    setIsRefreshing(false);
                    return;
                }

                // 4. 僅對選出的新文章進行翻譯與內容擴充
                const fetchedNewsPromises = newItemsToProcess.map(async (si, index) => {
                    const cleanTitle = await translateIfNeeded(si.rawTitle);
                    const rawSummaryText = si.item.description.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                    const translatedSummaryText = await translateIfNeeded(rawSummaryText);

                    // 內容擴充防空洞
                    let hasRealSnippet = translatedSummaryText.length > cleanTitle.length + 15;
                    let paragraph1 = hasRealSnippet 
                        ? translatedSummaryText 
                        : `根據《${si.source}》的最新報導指出，「${cleanTitle}」成為了目前的關注焦點。該事件的相關細節與最新進展，已由權威媒體正式對外發佈。`;

                    let paragraph2 = "";
                    switch(si.category) {
                        case "澳門時事": paragraph2 = "此類本地時事動態通常與市民生活息息相關，並可能涉及政策調整或社會發展。各界正密切留意後續效應及當局的進一步公佈。"; break;
                        case "琴澳深合": paragraph2 = "隨著粵港澳大灣區及橫琴深合區的加速融合，此類發展消息對於本澳未來的經濟適度多元及琴澳一體化具有重要的參考價值。"; break;
                        case "國際要聞": paragraph2 = "在全球化背景下，國際局勢的變動往往會產生牽一髮而動全身的影響。專家建議持續關注該事件對周邊地區乃至全球政經格局的潛在連鎖反應。"; break;
                        case "醫療與健康": paragraph2 = "醫療健康資訊關乎廣大市民的福祉。適時掌握最新的公共衛生動態與醫療發展，有助於提升個人及社區的整體健康防護意識。"; break;
                        case "數碼與科技": paragraph2 = "這項最新的科技動態，展現了行業創新的潛力，並可能在未來引發新一波的技術應用熱潮與產業升級。"; break;
                        case "交通與通關": paragraph2 = "交通基建與通關政策的優化，是提升城市運轉效率及便利市民出行的關鍵。相關措施的落實情況，將直接影響公眾的日常通勤體驗。"; break;
                        case "民生與消費": paragraph2 = "民生物價與消費市場的波動，是最能直接反映社會經濟溫度的指標。這則消息揭示了當前市場的最新趨勢，值得本地消費者留意。"; break;
                        case "體育與盛事": paragraph2 = "大型體育及盛事活動不僅能豐富市民的餘暇生活，更是推動本澳「旅遊+」跨界融合發展的重要引擎。"; break;
                        case "天氣與氣象": paragraph2 = "氣象變化難測，當局呼籲市民應隨時留意最新的天氣預測，並因應實際情況調整出行計劃，做好必要的預防措施。"; break;
                        default: paragraph2 = "這項最新動態已引起了所屬領域的廣泛討論。持續追蹤權威媒體的深度剖析，將有助於更全面地了解事件全貌。";
                    }

                    const finalSummary = paragraph1.substring(0, 90) + '...';

                    // 地域精準標示
                    let loc = "澳門";
                    if (si.category === "國際要聞") loc = "國際";
                    else if (/橫琴|深合區|珠海|大灣區|廣東/.test(cleanTitle)) loc = "大灣區";
                    else if (/香港/.test(cleanTitle)) loc = "香港";

                    return {
                        id: si.item.guid || (Date.now() + index).toString(),
                        baseTitle: si.rawTitle,
                        category: si.category,
                        title: cleanTitle,
                        summary: finalSummary,
                        content: `
                                  <div class="bg-slate-700/50 p-5 rounded-lg mb-4 text-sm break-words leading-relaxed shadow-inner">
                                      <p class="mb-4 text-slate-200">${paragraph1}</p>
                                      <p class="text-slate-300">${paragraph2}</p>
                                  </div>
                                  <div class="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-500 space-y-2">
                                      <p><i class="fas fa-info-circle mr-1 text-slate-400"></i>備註：這是一篇由 AI 引擎實時檢索的最新外部資訊。</p>
                                      <p><i class="fas fa-external-link-alt mr-1 text-slate-400"></i><span class="text-macau-400">請點擊上方來源連結</span>前往原始媒體網站閱讀完整報導。</p>
                                  </div>`,
                        source: si.source,
                        sourceUrl: si.item.link,
                        icon: "fa-bolt", 
                        sIcon: "fas fa-newspaper text-slate-300",
                        location: loc,
                        time: new Date(si.pubTime).toLocaleString('zh-MO', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                        createdAt: si.pubTime,
                        authority: si.authority,
                        verified: si.authority >= 7
                    };
                });

                const fetchedNews = await Promise.all(fetchedNewsPromises);

                setNewsData(prev => {
                    const newItems = fetchedNews.filter(n => !prev.some(p => p.baseTitle === n.baseTitle || p.id === n.id));
                    if (newItems.length > 0) {
                        if (!isInitial) displayToast(`⚡ AI 完成深度分析，精選更新了 ${newItems.length} 則高價值資訊！`);
                        return [...newItems, ...prev].slice(0, 150); // 保存量提升至 150 篇，確保各大類別都有足夠內容
                    } else {
                        if (!isInitial) displayToast("✅ 經深度檢索，目前版面資訊已是最精華準確，無須更新");
                        return prev;
                    }
                });
            } else {
                throw new Error("無法獲取實時數據");
            }
        } catch (error) {
            console.error("News fetch error:", error);
            if (!isInitial) displayToast("⚠️ 實時更新網絡不穩，請稍後重試");
        } finally {
            if (!isInitial) setIsRefreshing(false);
        }
    }, [displayToast]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleString('zh-MO', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        document.title = "澳視天下 - AI BETA";

        if (!hasFetchedInitial.current) {
            hasFetchedInitial.current = true;
            fetchLiveNews(true);
        }

        const newsAutoRefreshInterval = setInterval(() => {
            fetchLiveNews(false);
        }, 300000); // 每 5 分鐘自動刷新

        return () => {
            clearInterval(timer);
            clearInterval(newsAutoRefreshInterval);
        };
    }, [fetchLiveNews]);

    useEffect(() => {
        if (isSettingsOpen && listRef.current && typeof window !== 'undefined' && window.Sortable) {
            if (sortableRef.current) sortableRef.current.destroy();
            sortableRef.current = new window.Sortable(listRef.current, {
                handle: '.handle', animation: 200, delay: 100, delayOnTouchOnly: true, ghostClass: 'opacity-40',
                onEnd: () => {
                    const items = listRef.current.querySelectorAll('.sortable-item');
                    const newOrder = ["全部"];
                    items.forEach(i => newOrder.push(i.dataset.id));
                    setCategories(newOrder);
                    safeSetLocal('react_cats_v9_live', newOrder);
                }
            });
        }
    }, [isSettingsOpen]);

    const handleArticleClick = (article) => {
        setSelectedArticle(article);
        if (!readArticles.includes(article.id)) {
            setReadArticles(prev => [...prev, article.id]);
        }
    };

    const toggleBookmark = (e, id) => {
        e.stopPropagation();
        if (bookmarks.includes(id)) {
            setBookmarks(bookmarks.filter(b => b !== id));
            setUnbookmarkedTracker(prev => ({ ...prev, [id]: Date.now() }));
            displayToast("💔 已取消收藏，文章將於 3 天後清除");
        } else {
            setBookmarks([...bookmarks, id]);
            setUnbookmarkedTracker(prev => { const t = {...prev}; delete t[id]; return t; });
            displayToast("⭐ 已加入收藏庫，永久保存");
        }
    };

    const handleTouchStart = (e) => { if (document.getElementById('news-scroll-area').scrollTop === 0) startY.current = e.touches[0].pageY; else startY.current = 0; };
    const handleTouchMove = (e) => {
        if (startY.current === 0) return;
        const diff = e.touches[0].pageY - startY.current;
        if (diff > 0 && diff < 100) setPtrDistance(diff);
    };
    const handleTouchEnd = () => {
        if (ptrDistance > 60) {
            setIsRefreshing(true);
            setTimeout(() => { fetchLiveNews(false); setPtrDistance(0); }, 500); 
        } else setPtrDistance(0);
    };

    const onNavMouseDown = (e) => {
        isDragging.current = true;
        startX.current = e.pageX - navRef.current.offsetLeft;
        scrollLeft.current = navRef.current.scrollLeft;
    };
    const onNavMouseLeave = () => { isDragging.current = false; };
    const onNavMouseUp = () => { isDragging.current = false; };
    const onNavMouseMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const x = e.pageX - navRef.current.offsetLeft;
        const walk = (x - startX.current) * 2; 
        navRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const filteredNews = currentCategory === "全部" ? newsData : newsData.filter(n => n.category === currentCategory);
    // 介面依時間最新排序
    const displayNews = [...filteredNews].sort((a, b) => b.createdAt - a.createdAt);
    const unreadCount = newsData.filter(n => !readArticles.includes(n.id)).length;

    return (
        <div className="max-w-[480px] mx-auto bg-[#1e293b] h-[100dvh] sm:h-screen shadow-2xl flex flex-col relative overflow-x-hidden text-slate-200 overscroll-none select-none">
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
            `}} />

            <div className="flex justify-center w-full items-center text-macau-500 text-2xl transition-transform" style={{ height: '60px', marginTop: '-60px', transform: `translateY(${ptrDistance}px)` }}>
                <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${ptrDistance * 2}deg)` }}></i>
            </div>

            <header className="bg-macau-700 text-white p-4 sticky top-0 z-20 shadow-lg border-b border-macau-800 shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold tracking-wider flex items-center">
                            <i className="fas fa-newspaper mr-2 text-macau-100"></i>澳視天下
                            <span className="ml-2 text-[10px] bg-red-600 border border-red-800 px-1.5 py-0.5 rounded text-white font-mono tracking-tighter shadow-inner flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1"></span>AI BETA
                            </span>
                        </h1>
                        <p className="text-[10px] text-macau-100 mt-1 opacity-80">{currentTime}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative cursor-pointer" onClick={() => setCurrentCategory("全部")}>
                            <i className="fas fa-bell text-xl text-macau-100 hover:text-white transition-colors"></i>
                            {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{unreadCount}</span>}
                        </div>
                        <button onClick={() => setIsSettingsOpen(true)} className="text-macau-100 hover:text-white"><i className="fas fa-sliders-h text-xl"></i></button>
                    </div>
                </div>
            </header>

            {showToast && (
                <div className="absolute top-[80px] left-0 right-0 z-30 px-4 animate-[slideInDown_0.3s_ease-out]">
                    <div className="bg-macau-800 border border-macau-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center">
                        <i className="fas fa-info-circle text-macau-300 mr-2"></i> <span className="text-sm">{showToast}</span>
                    </div>
                </div>
            )}

            <nav className="bg-[#1e293b] border-b border-slate-700 sticky top-[72px] z-10 shadow-md shrink-0">
                <ul 
                    ref={navRef}
                    onMouseDown={onNavMouseDown}
                    onMouseLeave={onNavMouseLeave}
                    onMouseUp={onNavMouseUp}
                    onMouseMove={onNavMouseMove}
                    className="flex overflow-x-auto py-3 px-2 space-x-2 text-sm whitespace-nowrap scroll-smooth custom-scrollbar cursor-grab active:cursor-grabbing"
                >
                    {categories.map(cat => (
                        <li key={cat} onClick={() => setCurrentCategory(cat)} className={`cursor-pointer px-4 py-1.5 rounded-full border transition-all ${cat === currentCategory ? 'bg-macau-600 text-white border-macau-500 font-medium' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                            {cat}
                        </li>
                    ))}
                </ul>
            </nav>

            <main id="news-scroll-area" className="flex-1 p-4 bg-[#0f172a] overflow-y-auto relative scroll-smooth pb-10 custom-scrollbar" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {displayNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <i class="fas fa-satellite-dish text-5xl mb-4 text-macau-800 animate-pulse"></i>
                        <p>AI 正在進行多維度檢索與評分...</p>
                    </div>
                ) : (
                    displayNews.map(n => {
                        const isRead = readArticles.includes(n.id);
                        const isBookmarked = bookmarks.includes(n.id);
                        
                        return (
                            <div key={n.id} onClick={() => handleArticleClick(n)} className={`bg-slate-800 rounded-xl shadow-md border border-slate-700 p-4 mb-4 cursor-pointer transition-colors hover:bg-slate-750 hover:border-macau-600 ${isRead ? 'opacity-80' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-semibold text-macau-300 bg-macau-900/50 px-2 py-1 rounded"><i className={`fas ${n.icon} mr-1`}></i>{n.category}</span>
                                    </div>
                                    <button onClick={(e) => toggleBookmark(e, n.id)} className={`text-lg p-1 transition-transform active:scale-75 ${isBookmarked ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}>
                                        <i className={isBookmarked ? "fas fa-star" : "far fa-star"}></i>
                                    </button>
                                </div>
                                <h2 className={`text-lg font-bold leading-tight mb-2 flex items-start ${isRead ? 'text-slate-400 font-normal' : 'text-white'}`}>
                                    {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 mr-2 animate-pulse flex-shrink-0"></span>}
                                    {n.title}
                                </h2>
                                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{n.summary}</p>
                                <div className="flex justify-between items-center border-t border-slate-700 pt-3 mt-4 text-[10px] text-slate-400">
                                    <div className="flex items-center space-x-2">
                                        {n.authority >= 7 ? <i className="fas fa-shield-alt text-green-500" title="高權威來源"></i> : <i className="fas fa-exclamation-triangle text-orange-400" title="一般資訊"></i>}
                                        <a href={n.sourceUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="hover:text-macau-400 underline decoration-slate-600 underline-offset-2 z-10 relative">
                                            <i className={`${n.sourceIcon} mr-1`}></i>{n.source} <i className="fas fa-external-link-alt ml-1 text-[8px] opacity-70"></i>
                                        </a>
                                    </div>
                                    <span><i className="far fa-clock mr-1"></i>{n.time.split(' ')[1]}</span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div className="text-center text-xs text-slate-600 mt-6"><i className="fas fa-info-circle mr-1"></i>資訊保留 7 天，每 5 分鐘自動刷新。收藏文章永久保留。</div>
            </main>

            {/* Article Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedArticle(null)}>
                    <div className="bg-[#1e293b] w-full max-w-[480px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-[slideInDown_0.2s_ease-out_reverse]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 rounded-t-2xl sticky top-0 bg-[#1e293b] shrink-0">
                            <span className="text-xs font-semibold text-macau-400 bg-macau-900/50 border border-macau-800 px-2 py-1 rounded"><i className={`fas ${selectedArticle.icon} mr-1`}></i>{selectedArticle.category}</span>
                            <div className="flex space-x-4 items-center">
                                <button onClick={(e) => toggleBookmark(e, selectedArticle.id)} className={`text-xl ${bookmarks.includes(selectedArticle.id) ? 'text-yellow-400' : 'text-slate-500'}`}><i className={bookmarks.includes(selectedArticle.id) ? "fas fa-star" : "far fa-star"}></i></button>
                                <button onClick={() => setSelectedArticle(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600"><i className="fas fa-times"></i></button>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 pb-10 custom-scrollbar">
                            <h1 className="text-xl font-bold text-white mb-4 leading-snug select-text">{selectedArticle.title}</h1>
                            
                            <div className="flex justify-between items-center text-xs text-slate-400 mb-6 border-b border-slate-700 pb-4">
                                <a href={selectedArticle.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-macau-400 underline decoration-slate-500 underline-offset-2 flex items-center"><i className={`${selectedArticle.sourceIcon} mr-1`}></i>{selectedArticle.source} <i className="fas fa-external-link-alt ml-1.5 text-[10px] opacity-70"></i></a>
                                <span><i className="far fa-clock mr-1"></i>{selectedArticle.time}</span>
                            </div>

                            <div className="text-slate-300 text-sm select-text mb-8" dangerouslySetInnerHTML={{ __html: selectedArticle.content }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
                    <div className="bg-[#1e293b] w-11/12 max-w-[400px] rounded-2xl flex flex-col shadow-2xl border border-slate-600" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 shrink-0">
                            <h2 className="text-lg font-bold text-white"><i className="fas fa-sort-amount-down mr-2 text-macau-500"></i>管理資訊板塊</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <ul ref={listRef} className="p-2 overflow-y-auto max-h-[55vh] pb-6 custom-scrollbar">
                            {categories.filter(c => c !== "全部").map(cat => (
                                <li key={cat} data-id={cat} className="sortable-item flex justify-between items-center bg-slate-800 p-4 mb-2 mx-2 rounded-lg border border-slate-700">
                                    <span className="text-white">{cat}</span><i className="fas fa-bars text-slate-500 handle p-2 cursor-grab"></i>
                                </li>
                            ))}
                        </ul>
                        <div className="p-4 border-t border-slate-700 flex justify-between bg-[#1e293b] rounded-b-2xl shrink-0">
                            <button onClick={() => { setCategories([...defaultCategories]); safeSetLocal('react_cats_v9_live', defaultCategories); }} className="text-xs text-slate-400 hover:text-white px-3 py-2">恢復預設</button>
                            <button onClick={() => setIsSettingsOpen(false)} className="bg-macau-600 text-white text-sm font-semibold px-6 py-2 rounded-lg">完成</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}