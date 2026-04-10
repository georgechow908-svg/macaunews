import React, { useState, useEffect, useRef, useCallback } from 'react';
import './style.css';

const defaultCategories = ["全部", "澳門時事", "琴澳深合", "國際要聞", "醫療與健康", "數碼與科技", "電競與遊戲", "城中熱話", "交通與通關", "體育與盛事", "天氣與氣象", "尋味澳門", "民生與消費", "趣聞軼事", "天文地理"];

// 權威度評分 (分數越高越權威，用於過濾來源)
const authorityMap = { "官方": 10, "澳門日報": 9, "特區政府": 10, "聯合國": 10, "NASA": 10, "CNN": 9, "路透社": 9, "chu chu channel": 8, "大時事": 7, "Facebook": 3, "IG": 3, "Threads": 3 };
const getAuthority = (source) => Object.entries(authorityMap).find(([k]) => source.includes(k))?.[1] || 5;

// 安全的 LocalStorage 讀取與寫入
const safeGetLocal = (key, fallback) => {
    if (typeof window !== 'undefined') {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            return fallback;
        }
    }
    return fallback;
};

const safeSetLocal = (key, value) => {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }
};

const getCurrentTimeString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// 智能翻譯輔助函數 (若偵測到非中文，則自動呼叫翻譯 API)
const translateIfNeeded = async (text) => {
    if (!text) return text;
    // 簡單判斷：若文字中幾乎沒有中文字元，則視為外文進行翻譯
    if (!/[\u4e00-\u9fa5]/.test(text)) {
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-TW&dt=t&q=${encodeURIComponent(text)}`);
            const data = await res.json();
            return data[0].map(x => x[0]).join('');
        } catch (e) {
            console.error("翻譯失敗，回退至原文", e);
            return text;
        }
    }
    return text;
};

// 初始化邏輯：從 LocalStorage 讀取本地快取
const initializeNewsData = () => {
    const localNews = safeGetLocal('react_news_v7_live', []);
    const localBookmarks = safeGetLocal('react_bookmarks_v7_live', []);
    const localUnbookmarked = safeGetLocal('react_unbookmarked_v7_live', {});

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    const cleaned = localNews.filter(article => {
        if (localBookmarks.includes(article.id)) return true;
        if (localUnbookmarked[article.id]) {
            return (now - localUnbookmarked[article.id]) < threeDays;
        }
        return (now - article.createdAt) < sevenDays;
    });

    if (cleaned.length !== localNews.length) safeSetLocal('react_news_v7_live', cleaned);
    return cleaned;
};

export default function App() {
    const [categories, setCategories] = useState(() => safeGetLocal('react_cats_v7_live', [...defaultCategories]));
    const [newsData, setNewsData] = useState(initializeNewsData);
    const [readArticles, setReadArticles] = useState(() => safeGetLocal('react_read_v7_live', []));
    const [bookmarks, setBookmarks] = useState(() => safeGetLocal('react_bookmarks_v7_live', []));
    const [unbookmarkedTracker, setUnbookmarkedTracker] = useState(() => safeGetLocal('react_unbookmarked_v7_live', {}));
    
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

    const navRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    useEffect(() => { safeSetLocal('react_news_v7_live', newsData); }, [newsData]);
    useEffect(() => { safeSetLocal('react_bookmarks_v7_live', bookmarks); }, [bookmarks]);
    useEffect(() => { safeSetLocal('react_unbookmarked_v7_live', unbookmarkedTracker); }, [unbookmarkedTracker]);
    useEffect(() => { safeSetLocal('react_read_v7_live', readArticles); }, [readArticles]);

    const displayToast = useCallback((msg) => {
        setShowToast(msg);
        setTimeout(() => setShowToast(""), 3500);
    }, []);

    // 核心升級：連接真實 Google News 實時搜尋引擎並進行智能翻譯
    const fetchLiveNews = useCallback(async (isInitial = false) => {
        if (!isInitial) setIsRefreshing(true);
        try {
            // 利用 RSS to JSON API 抓取 Google 新聞的「澳門」關鍵字實時動態
            const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=澳門&hl=zh-TW&gl=MO&ceid=MO:zh-Hant');
            // 加入隨機時間戳避免瀏覽器快取
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&_=${Date.now()}`);
            const data = await response.json();

            if (data.status === 'ok' && data.items && data.items.length > 0) {
                // 使用 Promise.all 等待所有翻譯任務完成
                const fetchedNewsPromises = data.items.map(async (item, index) => {
                    const titleParts = item.title.split(' - ');
                    const source = titleParts.length > 1 ? titleParts.pop() : '網絡新聞';
                    const rawTitle = titleParts.join(' - ').trim();
                    
                    // 執行標題與內文的外文翻譯
                    const cleanTitle = await translateIfNeeded(rawTitle);
                    const rawSummaryText = item.description.replace(/<[^>]+>/g, '').trim();
                    const translatedSummaryText = await translateIfNeeded(rawSummaryText);
                    
                    // AI 模擬智能分類器
                    const assignCategory = (title) => {
                        if (/天氣|氣象|颱風|暴雨|雷暴|氣溫/.test(title)) return "天氣與氣象";
                        if (/通關|交通|巴士|輕軌|大橋|車|航班/.test(title)) return "交通與通關";
                        if (/橫琴|深合區|大灣區|珠海|廣東/.test(title)) return "琴澳深合";
                        if (/賭|博彩|酒店|旅遊|旅客|遊客|銀河|威尼斯人|金沙/.test(title)) return "旅業與博彩";
                        if (/演唱會|電影|明星|音樂|藝術|文化/.test(title)) return "娛樂與演唱會";
                        if (/體育|大賽車|足球|籃球|奧運/.test(title)) return "體育與盛事";
                        if (/消費|物價|經濟|超市|派錢|津貼|商戶/.test(title)) return "民生與消費";
                        if (/科技|AI|人工智能|網絡|電騙|詐騙/.test(title)) return "數碼與科技";
                        if (/美國|中國|國際|聯合國|世界|全球/.test(title)) return "國際要聞";
                        if (/醫|醫院|健康|病毒|感染/.test(title)) return "醫療與健康";
                        return "澳門時事";
                    };

                    const finalSummary = translatedSummaryText.substring(0, 90) + '...';

                    return {
                        id: item.guid || (Date.now() + index).toString(),
                        baseTitle: cleanTitle,
                        category: assignCategory(cleanTitle),
                        title: cleanTitle,
                        summary: finalSummary,
                        content: `
                                  <div class="bg-slate-700/50 p-4 rounded-lg mb-4 text-sm break-words leading-relaxed">${translatedSummaryText}</div>
                                  <div class="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-500 space-y-1.5">
                                      <p><i class="fas fa-info-circle mr-1 text-slate-400"></i>備註：這是一篇由 AI 引擎實時檢索的最新外部資訊。</p>
                                      <p><i class="fas fa-hand-pointer mr-1 text-slate-400"></i>請點擊上方來源連結前往原始媒體網站閱讀完整報導。</p>
                                  </div>`,
                        source: source,
                        sourceUrl: item.link,
                        icon: "fa-bolt", 
                        sIcon: "fas fa-newspaper text-slate-300",
                        location: "澳門",
                        time: new Date(item.pubDate.replace(/-/g, '/')).toLocaleString('zh-MO', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                        createdAt: new Date(item.pubDate.replace(/-/g, '/')).getTime() || Date.now(),
                        authority: getAuthority(source),
                        verified: true
                    };
                });

                const fetchedNews = await Promise.all(fetchedNewsPromises);

                setNewsData(prev => {
                    // 去重邏輯：只加入資料庫中尚未存在的新聞
                    const newItems = fetchedNews.filter(n => !prev.some(p => p.baseTitle === n.baseTitle || p.id === n.id));
                    if (newItems.length > 0) {
                        if (!isInitial) displayToast(`⚡ 實時引擎更新了 ${newItems.length} 則最新資訊！`);
                        return [...newItems, ...prev].slice(0, 100); // 最多保留 100 條最新資訊
                    } else {
                        if (!isInitial) displayToast("✅ 經實時檢索，目前版面資訊已是最準確，無須更新");
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
        // 設定每秒更新的時間顯示
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleString('zh-MO', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        document.title = "澳視天下 - AI BETA";

        // 初次載入時立刻執行一次實時檢索
        if (!hasFetchedInitial.current) {
            hasFetchedInitial.current = true;
            fetchLiveNews(true);
        }

        // 設置 5 分鐘自動更新的定時器 (300,000 毫秒)
        const newsAutoRefreshInterval = setInterval(() => {
            fetchLiveNews(false);
        }, 300000);

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
                    safeSetLocal('react_cats_v7_live', newOrder);
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

    // 下拉刷新邏輯
    const handleTouchStart = (e) => { if (document.getElementById('news-scroll-area').scrollTop === 0) startY.current = e.touches[0].pageY; else startY.current = 0; };
    const handleTouchMove = (e) => {
        if (startY.current === 0) return;
        const diff = e.touches[0].pageY - startY.current;
        if (diff > 0 && diff < 100) setPtrDistance(diff);
    };
    const handleTouchEnd = () => {
        if (ptrDistance > 60) {
            setIsRefreshing(true);
            setTimeout(() => { fetchLiveNews(false); setPtrDistance(0); }, 500); // 觸發手動實時檢索
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
    // 依據時間最新排序
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
                        <i className="fas fa-satellite-dish text-5xl mb-4 text-macau-800 animate-pulse"></i>
                        <p>AI 正在從實時網路為您檢索最新資訊...</p>
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
                                        {n.authority >= 7 ? <i className="fas fa-shield-alt text-green-500" title="高權威來源"></i> : <i className="fas fa-exclamation-triangle text-orange-400" title="社交平台資訊"></i>}
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

                            <div className="text-slate-300 text-sm leading-relaxed space-y-4 select-text mb-8 break-words" dangerouslySetInnerHTML={{ __html: selectedArticle.content }}></div>
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
                            <button onClick={() => { setCategories([...defaultCategories]); safeSetLocal('react_cats_v7_live', defaultCategories); }} className="text-xs text-slate-400 hover:text-white px-3 py-2">恢復預設</button>
                            <button onClick={() => setIsSettingsOpen(false)} className="bg-macau-600 text-white text-sm font-semibold px-6 py-2 rounded-lg">完成</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}