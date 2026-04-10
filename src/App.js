import React, { useState, useEffect, useRef } from 'react';
import './style.css';

const defaultCategories = ["全部", "澳門時事", "琴澳深合", "國際要聞", "醫療與健康", "數碼與科技", "電競與遊戲", "城中熱話", "交通與通關", "體育與盛事", "天氣與氣象", "尋味澳門", "民生與消費", "趣聞軼事", "天文地理"];

const realNewsDatabase = [
    {
        category: "國際要聞", title: "聯合國示警暖化衝擊恐逾千年：地球熱量91%被海洋吸收",
        summary: "世界氣象組織（WMO）發布報告指出，地球能量失衡持續擴大，91%多餘熱能被海洋吸收...",
        content: `<div class="bg-slate-700/50 p-4 rounded-lg mb-4"><h3 class="font-bold text-blue-400 mb-2"><i class="fas fa-list-ul mr-2"></i>新聞重點</h3><ul class="list-disc pl-5 text-sm space-y-1 text-slate-200"><li>過去11年是有紀錄以來最熱時期。</li><li>地球能量失衡創新高，超過91%多餘熱能被海洋吸收。</li></ul></div>
        <p class="mb-3">世界氣象組織（WMO）的最新氣候報告揭示了令人擔憂的趨勢：海洋正以驚人的速度吸收因溫室氣體排放而產生的多餘熱能。這種熱量積累不僅導致海水體積膨脹，加速全球海平面上升，更對脆弱的海洋生態系統（如珊瑚礁）造成不可逆的破壞。</p>
        <p>報告特別警告，由於海洋具有巨大的熱慣性，即使人類立刻停止所有溫室氣體排放，海洋的升溫與海平面上升趨勢仍將持續數個世紀甚至上千年。專家強烈呼籲各國政府必須立即設立具備實質行政權力的專責單位，加速推動氣候變遷的調適與減緩行動，以應對這場長期的氣候危機。</p>`,
        source: "關鍵評論網", sourceUrl: "https://www.thenewslens.com/article/266154", icon: "fa-globe-americas", sIcon: "fas fa-globe text-blue-400", location: "國際"
    },
    {
        category: "澳門時事", title: "澳門輕軌及公共巴士轉乘優惠預料今年內推出",
        summary: "交通事務局表示，為發揮軌道交通最大效益，爭取今年內推進落實輕軌與巴士轉乘優惠...",
        content: `<div class="bg-slate-700/50 p-4 rounded-lg mb-4"><h3 class="font-bold text-macau-400 mb-2"><i class="fas fa-list-ul mr-2"></i>新聞重點</h3><ul class="list-disc pl-5 text-sm space-y-1 text-slate-200"><li>當局正積極研究並推進輕軌與巴士轉乘優惠措施。</li><li>預計今年第三季起輕軌將安裝支援二維碼支付的新閘機。</li></ul></div>
        <p class="mb-3">為鼓勵市民使用綠色出行及舒緩路面交通擠塞，澳門交通事務局（DSAT）正加緊推動輕軌與公共巴士之間的轉乘優惠計劃。此舉旨在打破目前兩種公交系統各自獨立收費的局面，降低市民的出行成本。</p>
        <p>當局指出，這項政策將配合即將到來的巴士服務合同更新，以及輕軌全線閘機升級（支援更多電子支付及二維碼乘車）同步落實。隨著輕軌石排灣線及橫琴線等新路網陸續投入服務，完善的轉乘機制將能有效發揮軌道交通「骨幹」及巴士「接駁」的互補作用，大幅優化本澳整體的立體交通網絡。</p>`,
        source: "濠遊天下 Macau", sourceUrl: "https://macauonjourney.com/", icon: "fa-city", sIcon: "fas fa-newspaper text-slate-300", location: "澳門"
    },
    {
        category: "數碼與科技", title: "韋伯望遠鏡重磅發現：微型星系為宇宙「黑暗時期」點亮曙光",
        summary: "JWST 觀測數據顯示，最微小的星系可能扮演了驅散宇宙迷霧、重新點燃光芒的關鍵角色...",
        content: `<div class="bg-slate-700/50 p-4 rounded-lg mb-4"><h3 class="font-bold text-indigo-400 mb-2"><i class="fas fa-list-ul mr-2"></i>新聞重點</h3><ul class="list-disc pl-5 text-sm space-y-1 text-slate-200"><li>最新數據強烈證明，數量龐大的微小星系貢獻了大部分能量。</li><li>解開了長久以來關於宇宙「再電離時期」能量來源的謎團。</li></ul></div>
        <p class="mb-3">在宇宙大爆炸後的初期，宇宙曾被濃密的中性氫氣體所籠罩，光線無法穿透，這段時期被稱為宇宙的「黑暗時代」。天文學界長期以來一直在爭論：究竟是少數巨大的星系，還是大量微小的星系，提供了足夠的能量來游離這些氣體，讓宇宙重新變得透明（即再電離時期）？</p>
        <p>借助詹姆斯·韋伯太空望遠鏡（JWST）前所未有的紅外線觀測能力，國際天文學團隊終於找到了決定性的證據。數據顯示，早期宇宙中存在著數量驚人的超微型星系，這些星系雖然體積小，卻能釋放出極高能量的游離光子。這項突破性發現證實了「微小星系是點亮早期宇宙主力」的假說，徹底改寫了人類對宇宙黎明時期星系演化的理解。</p>`,
        source: "大時事", sourceUrl: "https://bigtimes.net/archives/98495", icon: "fa-robot", sIcon: "fas fa-microchip text-indigo-400", location: "國際"
    }
];

export default function App() {
    // 狀態管理 (React State)
    const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('react_cats_v1')) || [...defaultCategories]);
    const [newsData, setNewsData] = useState([]);
    const [readArticles, setReadArticles] = useState(() => JSON.parse(localStorage.getItem('react_read_v1')) || []);
    const [currentCategory, setCurrentCategory] = useState("全部");
    
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [currentTime, setCurrentTime] = useState("");
    
    // 下拉刷新狀態
    const [ptrDistance, setPtrDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const sortableRef = useRef(null);
    const listRef = useRef(null);

    // 時間更新
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleString('zh-MO', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 初次載入獲取新聞及設定標題
    useEffect(() => {
        document.title = "澳視天下 - AI Beta版"; // 動態修改瀏覽器分頁標題
        fetchLiveNews(true);
    }, []);

    // 當打開設定時，初始化 SortableJS
    useEffect(() => {
        if (isSettingsOpen && listRef.current) {
            if (sortableRef.current) sortableRef.current.destroy();
            sortableRef.current = new window.Sortable(listRef.current, {
                handle: '.handle', animation: 200, delay: 100, delayOnTouchOnly: true, ghostClass: 'opacity-40',
                onEnd: () => {
                    const items = listRef.current.querySelectorAll('.sortable-item');
                    const newOrder = ["全部"];
                    items.forEach(i => newOrder.push(i.dataset.id));
                    setCategories(newOrder);
                    localStorage.setItem('react_cats_v1', JSON.stringify(newOrder));
                }
            });
        }
    }, [isSettingsOpen]);

    const getCurrentTimeString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const fetchLiveNews = (isInitial = false) => {
        const t = realNewsDatabase[Math.floor(Math.random() * realNewsDatabase.length)];
        const newArt = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            category: t.category, title: t.title + (isInitial ? "" : " (速報)"),
            summary: t.summary, content: t.content, source: t.source, sourceUrl: t.sourceUrl, sourceIcon: t.sIcon,
            location: t.location, time: getCurrentTimeString(), verified: true, icon: t.icon
        };

        setNewsData(prev => {
            const updated = [newArt, ...prev].slice(0, 30);
            return updated;
        });

        if (!isInitial) {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
        }
    };

    const handleArticleClick = (article) => {
        setSelectedArticle(article);
        if (!readArticles.includes(article.id)) {
            const newRead = [...readArticles, article.id];
            setReadArticles(newRead);
            localStorage.setItem('react_read_v1', JSON.stringify(newRead));
        }
    };

    // 下拉刷新事件
    const handleTouchStart = (e) => {
        if (document.getElementById('news-scroll-area').scrollTop === 0) startY.current = e.touches[0].pageY;
        else startY.current = 0;
    };
    const handleTouchMove = (e) => {
        if (startY.current === 0) return;
        const diff = e.touches[0].pageY - startY.current;
        if (diff > 0 && diff < 100) setPtrDistance(diff);
    };
    const handleTouchEnd = () => {
        if (ptrDistance > 60) {
            setIsRefreshing(true);
            setTimeout(() => { fetchLiveNews(false); setPtrDistance(0); setIsRefreshing(false); }, 800);
        } else {
            setPtrDistance(0);
        }
    };

    const filteredNews = currentCategory === "全部" ? newsData : newsData.filter(n => n.category === currentCategory);
    const unreadCount = newsData.filter(n => !readArticles.includes(n.id)).length;

    return (
        <div className="max-w-[480px] mx-auto bg-[#1e293b] min-h-screen shadow-2xl flex flex-col relative overflow-x-hidden text-slate-200 overscroll-none select-none">
            
            {/* 下拉刷新指示器 */}
            <div className="flex justify-center w-full items-center text-macau-500 text-2xl transition-transform" style={{ height: '60px', marginTop: '-60px', transform: `translateY(${ptrDistance}px)` }}>
                <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${ptrDistance * 2}deg)` }}></i>
            </div>

            {/* Header */}
            <header className="bg-macau-700 text-white p-4 sticky top-0 z-20 shadow-lg border-b border-macau-800">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold tracking-wider flex items-center">
                            <i className="fas fa-newspaper mr-2 text-macau-100"></i>澳視天下
                            <span className="ml-2 text-[10px] bg-red-600 border border-red-800 px-1.5 py-0.5 rounded text-white font-mono tracking-tighter shadow-inner flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1"></span>BETA
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

            {/* Toast */}
            {showToast && (
                <div className="absolute top-[80px] left-0 right-0 z-30 px-4 animate-bounce">
                    <div className="bg-macau-800 border border-macau-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-between">
                        <div className="flex items-center text-sm"><i className="fas fa-bolt text-yellow-400 mr-2"></i> 新的 AI 搜羅資訊！</div>
                    </div>
                </div>
            )}

            {/* Nav Tabs */}
            <nav className="bg-[#1e293b] border-b border-slate-700 sticky top-[72px] z-10 shadow-md">
                <ul className="flex overflow-x-auto no-scrollbar py-3 px-2 space-x-2 text-sm whitespace-nowrap scroll-smooth">
                    {categories.map(cat => (
                        <li key={cat} onClick={() => setCurrentCategory(cat)} className={`cursor-pointer px-4 py-1.5 rounded-full border transition-all ${cat === currentCategory ? 'bg-macau-600 text-white border-macau-500 font-medium' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                            {cat}
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Main Content */}
            <main id="news-scroll-area" className="flex-1 p-4 bg-[#0f172a] overflow-y-auto relative scroll-smooth pb-10" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {filteredNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500"><i className="fas fa-check-double text-5xl mb-4 text-macau-800"></i><p>目前無資訊</p></div>
                ) : (
                    filteredNews.map(n => {
                        const isRead = readArticles.includes(n.id);
                        return (
                            <div key={n.id} onClick={() => handleArticleClick(n)} className={`bg-slate-800 rounded-xl shadow-md border border-slate-700 p-4 mb-4 cursor-pointer hover:border-macau-600 ${isRead ? 'opacity-75' : ''}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-semibold text-macau-300 bg-macau-900/50 px-2 py-1 rounded"><i className={`fas ${n.icon} mr-1`}></i>{n.category}</span>
                                    <span className="text-[10px] text-slate-500"><i className="fas fa-map-marker-alt mr-1"></i>{n.location}</span>
                                </div>
                                <h2 className={`text-lg font-bold leading-tight mb-2 flex items-start ${isRead ? 'text-slate-400 font-normal' : 'text-white'}`}>
                                    {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 mr-2 animate-pulse flex-shrink-0"></span>}
                                    {n.title}
                                </h2>
                                <div className="flex justify-between items-center border-t border-slate-700 pt-3 mt-4 text-[10px] text-slate-400">
                                    <a href={n.sourceUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center hover:text-macau-400 underline decoration-slate-600 underline-offset-2 z-10 relative">
                                        <i className={`${n.sourceIcon} mr-1`}></i>{n.source} <i className="fas fa-external-link-alt ml-1 text-[8px] opacity-70"></i>
                                    </a>
                                    <span><i className="far fa-clock mr-1"></i>{n.time}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Article Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedArticle(null)}>
                    <div className="bg-[#1e293b] w-full max-w-[480px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-[slideInDown_0.3s_ease-out_reverse]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-700 rounded-t-2xl sticky top-0 bg-[#1e293b]">
                            <span className="text-xs font-semibold text-macau-400 bg-macau-900/50 border border-macau-800 px-2 py-1 rounded"><i className={`fas ${selectedArticle.icon} mr-1`}></i>{selectedArticle.category}</span>
                            <button onClick={() => setSelectedArticle(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 no-scrollbar pb-10">
                            <h1 className="text-xl font-bold text-white mb-3 leading-snug">{selectedArticle.title}</h1>
                            <div className="flex justify-between items-center text-xs text-slate-400 mb-6 border-b border-slate-700 pb-4 mt-4">
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
                            <button onClick={() => { setCategories([...defaultCategories]); localStorage.setItem('react_cats_v1', JSON.stringify(defaultCategories)); }} className="text-xs text-slate-400 hover:text-white px-3 py-2">恢復預設</button>
                            <button onClick={() => setIsSettingsOpen(false)} className="bg-macau-600 text-white text-sm font-semibold px-6 py-2 rounded-lg">完成</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}