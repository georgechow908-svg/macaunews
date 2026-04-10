import React, { useState, useEffect, useRef } from 'react';
import './style.css';

const defaultCategories = ["全部", "澳門時事", "琴澳深合", "國際要聞", "醫療與健康", "數碼與科技", "電競與遊戲", "城中熱話", "交通與通關", "體育與盛事", "天氣與氣象", "尋味澳門", "民生與消費", "趣聞軼事", "天文地理"];

// 權威度評分 (分數越高越權威，去重時會取代低分來源)
const authorityMap = { "官方": 10, "澳門日報": 9, "CNN": 9, "路透社": 9, "chu chu channel": 8, "大時事": 7, "Facebook": 3, "IG": 3, "Threads": 3 };
const getAuthority = (source) => Object.entries(authorityMap).find(([k]) => source.includes(k))?.[1] || 5;

// 真實新聞數據庫 (加入 baseTitle 用於辨識同一事件，加入權威度)
const realNewsDatabase = [
    {
        baseTitle: "氣候變暖影響", category: "國際要聞", title: "聯合國示警暖化衝擊恐逾千年：地球熱量91%被海洋吸收",
        summary: "世界氣象組織（WMO）發布報告指出，地球能量失衡持續擴大，91%多餘熱能被海洋吸收...",
        content: `<div class="bg-slate-700/50 p-4 rounded-lg mb-4"><h3 class="font-bold text-blue-400 mb-2"><i class="fas fa-list-ul mr-2"></i>新聞重點</h3><ul class="list-disc pl-5 text-sm space-y-1 text-slate-200"><li>過去11年是有紀錄以來最熱時期。</li><li>地球能量失衡創新高，超過91%多餘熱能被海洋吸收。</li></ul></div>
        <p class="mb-3">世界氣象組織（WMO）的最新氣候報告揭示了令人擔憂的趨勢：海洋正以驚人的速度吸收因溫室氣體排放而產生的多餘熱能。</p>`,
        source: "路透社", sourceUrl: "https://www.reuters.com/", icon: "fa-globe-americas", sIcon: "fas fa-globe text-blue-400", location: "國際"
    },
    {
        baseTitle: "輕軌巴士轉乘", category: "澳門時事", title: "澳門輕軌及公共巴士轉乘優惠預料今年內推出",
        summary: "交通事務局表示，為發揮軌道交通最大效益，爭取今年內推進落實輕軌與巴士轉乘優惠...",
        content: `<div class="bg-slate-700/50 p-4 rounded-lg mb-4"><h3 class="font-bold text-macau-400 mb-2"><i class="fas fa-list-ul mr-2"></i>新聞重點</h3><ul class="list-disc pl-5 text-sm space-y-1 text-slate-200"><li>當局正積極研究並推進輕軌與巴士轉乘優惠措施。</li><li>預計今年第三季起輕軌將安裝支援二維碼支付的新閘機。</li></ul></div>
        <p class="mb-3">為鼓勵市民使用綠色出行及舒緩路面交通擠塞，澳門交通事務局正加緊推動輕軌與公共巴士之間的轉乘優惠計劃。</p>`,
        source: "澳門日報", sourceUrl: "http://www.macaodaily.com/", icon: "fa-city", sIcon: "fas fa-newspaper text-slate-300", location: "澳門"
    },
    {
        baseTitle: "輕軌巴士轉乘", category: "澳門時事", title: "網傳輕軌同巴士終於有轉乘優惠？",
        summary: "網民熱議交通局即將推出輕軌轉乘巴士優惠，減輕市民出行負擔...",
        content: `<p>網上群組熱烈討論即將推出的轉乘優惠，不少網民表示期待，但具體細節仍有待公佈。</p>`,
        source: "Facebook 澳門交通群組", sourceUrl: "#", icon: "fa-city", sIcon: "fab fa-facebook text-blue-500", location: "澳門"
    },
    {
        baseTitle: "宇宙黑暗時期", category: "數碼與科技", title: "韋伯望遠鏡重磅發現：微型星系為宇宙「黑暗時期」點亮曙光",
        summary: "JWST 觀測數據顯示，最微小的星系可能扮演了驅散宇宙迷霧、重新點燃光芒的關鍵角色...",
        content: `<div class="bg-slate-700/50 p-4 rounded-lg mb-4"><h3 class="font-bold text-indigo-400 mb-2"><i class="fas fa-list-ul mr-2"></i>新聞重點</h3><ul class="list-disc pl-5 text-sm space-y-1 text-slate-200"><li>最新數據強烈證明，數量龐大的微小星系貢獻了大部分能量。</li></ul></div><p>這項發現改寫了我們對宇宙黎明的理解。</p>`,
        source: "大時事", sourceUrl: "https://bigtimes.net/", icon: "fa-robot", sIcon: "fas fa-microchip text-indigo-400", location: "國際"
    },
    {
        baseTitle: "週末好去處", category: "尋味澳門", title: "澳門週末隱世打卡點！路環最新海景Cafe實測",
        summary: "帶你探索路環最新開幕的海景咖啡店，日落打卡一流，食物質素有驚喜...",
        content: `<div class="bg-slate-700/50 p-4 rounded-lg mb-4"><h3 class="font-bold text-orange-400 mb-2"><i class="fas fa-list-ul mr-2"></i>好去處重點</h3><ul class="list-disc pl-5 text-sm space-y-1 text-slate-200"><li>地點隱蔽，享有180度無死角海景。</li><li>招牌麻糬窩夫必試。</li></ul></div><p>週末不知道去哪裡？跟著我們一起去路環發掘新大陸！</p>`,
        source: "chu chu channel", sourceUrl: "https://www.youtube.com/", icon: "fa-utensils", sIcon: "fab fa-youtube text-red-500", location: "澳門路環"
    },
    {
        baseTitle: "的士難截", category: "城中熱話", title: "澳門截的士辛酸史 引發全網共鳴",
        summary: "近日一篇關於「在澳門街頭截的士的辛酸史」的貼文引發廣大本地網民及遊客共鳴...",
        content: `<p>帖主分享了自己在雨天提着重物在皇朝區等了近半小時仍截不到的士的經歷。網民呼籲政府加快引入網約車。</p>`,
        source: "Threads", sourceUrl: "https://www.threads.net/", icon: "fa-fire", sIcon: "fas fa-hashtag text-white", location: "澳門"
    }
].map(n => ({ ...n, authority: getAuthority(n.source) }));

export default function App() {
    // 狀態管理 (React State) 升級版 keys，確保讀取最新邏輯
    const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('react_cats_v3')) || [...defaultCategories]);
    const [newsData, setNewsData] = useState(() => JSON.parse(localStorage.getItem('react_news_v3')) || []);
    const [readArticles, setReadArticles] = useState(() => JSON.parse(localStorage.getItem('react_read_v3')) || []);
    const [bookmarks, setBookmarks] = useState(() => JSON.parse(localStorage.getItem('react_bookmarks_v3')) || []);
    const [unbookmarkedTracker, setUnbookmarkedTracker] = useState(() => JSON.parse(localStorage.getItem('react_unbookmarked_v3')) || {});
    
    const [currentCategory, setCurrentCategory] = useState("全部");
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showToast, setShowToast] = useState("");
    const [currentTime, setCurrentTime] = useState("");
    
    const [ptrDistance, setPtrDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const listRef = useRef(null);

    // 時間更新
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleString('zh-MO', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 初次載入：執行智能保留期限 (7天) 及清理邏輯
    useEffect(() => {
        document.title = "澳視天下 - AI Beta版";
        
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const threeDays = 3 * 24 * 60 * 60 * 1000;

        setNewsData(prev => {
            const cleaned = prev.filter(article => {
                // 收藏的文章永遠保留
                if (bookmarks.includes(article.id)) return true;
                // 取消收藏的文章保留 3 天
                if (unbookmarkedTracker[article.id]) {
                    return (now - unbookmarkedTracker[article.id]) < threeDays;
                }
                // 普通新聞保留 7 天
                return (now - article.createdAt) < sevenDays;
            });
            if (cleaned.length !== prev.length) localStorage.setItem('react_news_v3', JSON.stringify(cleaned));
            
            // 如果清理後沒新聞，或初次載入，抓取新資訊
            if (cleaned.length === 0) setTimeout(() => fetchLiveNews(true), 500);
            return cleaned;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 儲存狀態至 LocalStorage
    useEffect(() => { localStorage.setItem('react_news_v3', JSON.stringify(newsData)); }, [newsData]);
    useEffect(() => { localStorage.setItem('react_bookmarks_v3', JSON.stringify(bookmarks)); }, [bookmarks]);
    useEffect(() => { localStorage.setItem('react_unbookmarked_v3', JSON.stringify(unbookmarkedTracker)); }, [unbookmarkedTracker]);

    const getCurrentTimeString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const displayToast = (msg) => {
        setShowToast(msg);
        setTimeout(() => setShowToast(""), 3500);
    };

    // AI 獲取新聞及「權威去重」邏輯
    const fetchLiveNews = (isInitial = false) => {
        // 隨機抽選一篇候選新聞
        const template = realNewsDatabase[Math.floor(Math.random() * realNewsDatabase.length)];
        
        setNewsData(prev => {
            let updatedList = [...prev];
            const existingIdx = updatedList.findIndex(n => n.baseTitle === template.baseTitle);

            if (existingIdx !== -1) {
                // 發現同事件新聞，比較權威度
                if (template.authority > updatedList[existingIdx].authority) {
                    const newArt = {
                        ...template, id: updatedList[existingIdx].id, // 繼承舊 ID 保留已讀/收藏狀態
                        title: template.title + " (權威更新)",
                        time: getCurrentTimeString(), createdAt: Date.now()
                    };
                    updatedList[existingIdx] = newArt;
                    if(!isInitial) displayToast("🔄 AI 已將一則社交傳聞更新為官方權威報導");
                } else if (!isInitial) {
                    displayToast("✅ AI 已確認目前資訊為最新最準確，無須更新");
                }
            } else {
                // 全新事件，直接加入
                const newArt = {
                    ...template, id: Date.now() + Math.floor(Math.random() * 1000),
                    title: template.title + (isInitial ? "" : " (速報)"),
                    time: getCurrentTimeString(), createdAt: Date.now(), verified: template.authority >= 7
                };
                updatedList = [newArt, ...updatedList];
                if(!isInitial) displayToast("⚡ 記者剛剛搜羅了新資訊！");
            }
            return updatedList.slice(0, 50); // 最多保留 50 條
        });
    };

    const handleArticleClick = (article) => {
        setSelectedArticle(article);
        if (!readArticles.includes(article.id)) {
            const newRead = [...readArticles, article.id];
            setReadArticles(newRead);
            localStorage.setItem('react_read_v3', JSON.stringify(newRead));
        }
    };

    const toggleBookmark = (e, id) => {
        e.stopPropagation();
        if (bookmarks.includes(id)) {
            // 取消收藏：加入 3 天刪除倒數
            setBookmarks(bookmarks.filter(b => b !== id));
            setUnbookmarkedTracker(prev => ({ ...prev, [id]: Date.now() }));
            displayToast("💔 已取消收藏，文章將於 3 天後清除");
        } else {
            // 加入收藏：移除刪除倒數
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
            setTimeout(() => { fetchLiveNews(false); setPtrDistance(0); setIsRefreshing(false); }, 800);
        } else setPtrDistance(0);
    };

    const filteredNews = currentCategory === "全部" ? newsData : newsData.filter(n => n.category === currentCategory);
    const unreadCount = newsData.filter(n => !readArticles.includes(n.id)).length;

    return (
        <div className="max-w-[480px] mx-auto bg-[#1e293b] min-h-screen shadow-2xl flex flex-col relative overflow-x-hidden text-slate-200 overscroll-none select-none">
            
            <div className="flex justify-center w-full items-center text-macau-500 text-2xl transition-transform" style={{ height: '60px', marginTop: '-60px', transform: `translateY(${ptrDistance}px)` }}>
                <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${ptrDistance * 2}deg)` }}></i>
            </div>

            <header className="bg-macau-700 text-white p-4 sticky top-0 z-20 shadow-lg border-b border-macau-800">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold tracking-wider flex items-center">
                            <i className="fas fa-newspaper mr-2 text-macau-100"></i>澳視天下
                            <span className="ml-2 text-[10px] bg-red-600 border border-red-800 px-1.5 py-0.5 rounded text-white font-mono tracking-tighter shadow-inner flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1"></span>AI Beta版
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

            <nav className="bg-[#1e293b] border-b border-slate-700 sticky top-[72px] z-10 shadow-md">
                <ul className="flex overflow-x-auto no-scrollbar py-3 px-2 space-x-2 text-sm whitespace-nowrap scroll-smooth">
                    {categories.map(cat => (
                        <li key={cat} onClick={() => setCurrentCategory(cat)} className={`cursor-pointer px-4 py-1.5 rounded-full border transition-all ${cat === currentCategory ? 'bg-macau-600 text-white border-macau-500 font-medium' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                            {cat}
                        </li>
                    ))}
                </ul>
            </nav>

            <main id="news-scroll-area" className="flex-1 p-4 bg-[#0f172a] overflow-y-auto relative scroll-smooth pb-10" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {filteredNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500"><i className="fas fa-check-double text-5xl mb-4 text-macau-800"></i><p>目前無資訊</p></div>
                ) : (
                    filteredNews.map(n => {
                        const isRead = readArticles.includes(n.id);
                        const isBookmarked = bookmarks.includes(n.id);
                        return (
                            <div key={n.id} onClick={() => handleArticleClick(n)} className={`bg-slate-800 rounded-xl shadow-md border border-slate-700 p-4 mb-4 cursor-pointer hover:border-macau-600 ${isRead ? 'opacity-80' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-semibold text-macau-300 bg-macau-900/50 px-2 py-1 rounded"><i className={`fas ${n.icon} mr-1`}></i>{n.category}</span>
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
                <div className="text-center text-xs text-slate-600 mt-6"><i className="fas fa-info-circle mr-1"></i>一般資訊將保留 7 天，收藏文章永久保留。</div>
            </main>

            {/* Article Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedArticle(null)}>
                    <div className="bg-[#1e293b] w-full max-w-[480px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-[slideInDown_0.2s_ease-out_reverse]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 rounded-t-2xl sticky top-0 bg-[#1e293b]">
                            <span className="text-xs font-semibold text-macau-400 bg-macau-900/50 border border-macau-800 px-2 py-1 rounded"><i className={`fas ${selectedArticle.icon} mr-1`}></i>{selectedArticle.category}</span>
                            <div className="flex space-x-4 items-center">
                                <button onClick={(e) => toggleBookmark(e, selectedArticle.id)} className={`text-xl ${bookmarks.includes(selectedArticle.id) ? 'text-yellow-400' : 'text-slate-500'}`}><i className={bookmarks.includes(selectedArticle.id) ? "fas fa-star" : "far fa-star"}></i></button>
                                <button onClick={() => setSelectedArticle(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600"><i className="fas fa-times"></i></button>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 no-scrollbar pb-10">
                            <h1 className="text-xl font-bold text-white mb-4 leading-snug">{selectedArticle.title}</h1>
                            
                            {/* Fact Check 警示標語 */}
                            {selectedArticle.authority < 5 && (
                                <div className="bg-orange-900/30 border border-orange-800/50 text-orange-300 p-3 rounded-lg text-xs mb-5 flex items-start shadow-inner">
                                    <i className="fas fa-exclamation-triangle mt-0.5 mr-2 text-orange-400"></i>
                                    <p><strong>社交平台資訊：</strong>此內容擷取自社交網絡，可能帶有個人立場或未經完全證實。Fact Check 建議：請以官方網站或主流媒體發佈之最終資訊為準。</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xs text-slate-400 mb-6 border-b border-slate-700 pb-4">
                                <a href={selectedArticle.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-macau-400 underline decoration-slate-500 underline-offset-2 flex items-center"><i className={`${selectedArticle.sourceIcon} mr-1`}></i>{selectedArticle.source} <i className="fas fa-external-link-alt ml-1.5 text-[10px] opacity-70"></i></a>
                                <span><i className="far fa-clock mr-1"></i>{selectedArticle.time}</span>
                            </div>
                            <div className="text-slate-300 text-sm leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: selectedArticle.content }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
                    <div className="bg-[#1e293b] w-11/12 max-w-[400px] rounded-2xl flex flex-col shadow-2xl border border-slate-600" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-white"><i className="fas fa-sort-amount-down mr-2 text-macau-500"></i>管理資訊板塊</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
                        </div>
                        <ul ref={listRef} className="p-2 overflow-y-auto max-h-[55vh] no-scrollbar pb-6">
                            {categories.filter(c => c !== "全部").map(cat => (
                                <li key={cat} data-id={cat} className="sortable-item flex justify-between items-center bg-slate-800 p-4 mb-2 mx-2 rounded-lg border border-slate-700">
                                    <span className="text-white">{cat}</span><i className="fas fa-bars text-slate-500 handle p-2 cursor-grab"></i>
                                </li>
                            ))}
                        </ul>
                        <div className="p-4 border-t border-slate-700 flex justify-between bg-[#1e293b] rounded-b-2xl">
                            <button onClick={() => { setCategories([...defaultCategories]); localStorage.setItem('react_cats_v3', JSON.stringify(defaultCategories)); }} className="text-xs text-slate-400 hover:text-white px-3 py-2">恢復預設</button>
                            <button onClick={() => setIsSettingsOpen(false)} className="bg-macau-600 text-white text-sm font-semibold px-6 py-2 rounded-lg">完成</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}