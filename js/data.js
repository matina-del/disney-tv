/**
 * 数据管理文件
 * 提供动画片数据的加载、筛选、排序、搜索等功能
 */

// ================= 全局变量 =================
let cartoonsData = [];

// 缓存相关常量
const CACHE_KEY = 'cartoons_data_cache';
const CACHE_TIMESTAMP_KEY = 'cartoons_data_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 收藏相关常量
const COLLECTION_KEY = 'cartoon_collections';

// 播放历史相关常量
const HISTORY_KEY = 'play_history';
const PROGRESS_KEY_PREFIX = 'play_progress_';

// 评论相关常量
const COMMENTS_KEY_PREFIX = 'cartoon_comments_';

// ================= 数据加载 =================

/**
 * 从缓存获取数据
 * @returns {Array|null} 缓存的动画片数据，如果不存在或过期则返回null
 */
function getCachedData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cached && timestamp) {
            const now = Date.now();
            const cacheTime = parseInt(timestamp, 10);
            
            // 检查缓存是否过期
            if (now - cacheTime < CACHE_DURATION) {
                return JSON.parse(cached);
            } else {
                // 缓存过期，清除
                clearDataCache();
            }
        }
    } catch (e) {
        console.error('读取缓存失败:', e);
        clearDataCache();
    }
    return null;
}

/**
 * 保存数据到缓存
 * @param {Array} data - 要缓存的动画片数据
 */
function setCachedData(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
        console.error('保存缓存失败:', e);
        // 如果存储空间不足，尝试清除旧缓存
        if (e.name === 'QuotaExceededError') {
            clearDataCache();
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            } catch (e2) {
                console.error('再次保存缓存失败:', e2);
            }
        }
    }
}

/**
 * 清除数据缓存
 */
function clearDataCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (e) {
        console.error('清除缓存失败:', e);
    }
}

/**
 * 从JSON文件加载动画片数据（带缓存）
 * @returns {Promise<Array>} 动画片数据数组
 * 
 * @example
 * const data = await loadCartoons();
 * console.log('加载了', data.length, '部动画片');
 */
async function loadCartoons() {
    // 先检查LocalStorage缓存
    const cached = getCachedData();
    if (cached) {
        cartoonsData = cached;
        return cached;
    }
    
    // 如果有缓存且未过期，返回缓存数据
    // 否则从JSON文件加载
    try {
        const response = await fetch('data/cartoons.json');
        if (response.ok) {
            const data = await response.json();
            
            // 验证数据格式
            if (Array.isArray(data)) {
                // 验证每个动画片数据
                const validData = data.filter(cartoon => validateCartoon(cartoon));
                cartoonsData = validData;
                
                // 加载后缓存到LocalStorage
                setCachedData(validData);
                
                if (validData.length !== data.length) {
                    console.warn(`数据验证：${data.length - validData.length} 条无效数据已过滤`);
                }
                
                return validData;
            } else {
                console.error('数据格式错误：期望数组，实际为', typeof data);
                return [];
            }
        } else {
            console.error('加载数据失败:', response.status, response.statusText);
            console.error('提示：请使用本地服务器运行，直接打开HTML文件会有CORS问题');
            return [];
        }
    } catch (error) {
        console.error('加载数据时出错:', error);
        console.error('错误详情：', error.message);
        console.error('提示：请使用本地服务器运行，直接打开HTML文件会有CORS问题');
        console.error('解决方法：');
        console.error('1. 使用Python: python -m http.server 8000');
        console.error('2. 使用Node.js: npx http-server -p 8000');
        console.error('3. 使用VS Code Live Server扩展');
        return [];
    }
}

// 兼容旧函数名
async function loadCartoonsData() {
    return await loadCartoons();
}

/**
 * 获取所有动画片
 * @returns {Array} 所有动画片数据
 */
function getAllCartoons() {
    return cartoonsData || [];
}

/**
 * 根据ID获取动画片
 * @param {number|string} id - 动画片ID
 * @returns {Object|null} 动画片对象，如果不存在则返回null
 * 
 * @example
 * const cartoon = getCartoonById(1);
 * console.log(cartoon.title);
 */
function getCartoonById(id) {
    if (!cartoonsData || cartoonsData.length === 0) {
        return null;
    }
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return cartoonsData.find(cartoon => cartoon.id === numId) || null;
}

/**
 * 获取所有分类
 * @returns {Array} 所有分类名称数组
 * 
 * @example
 * const categories = getAllCategories();
 * console.log(categories); // ['迪士尼经典', '华纳兄弟', '经典国产']
 */
function getAllCategories() {
    if (!cartoonsData || cartoonsData.length === 0) {
        return [];
    }
    const categories = new Set();
    cartoonsData.forEach(cartoon => {
        if (cartoon.category) {
            categories.add(cartoon.category);
        }
    });
    return Array.from(categories);
}

// ================= 数据筛选 =================

/**
 * 按分类筛选动画片
 * @param {Array} cartoons - 动画片数组（可选，默认使用全部数据）
 * @param {string} category - 分类名称
 * @returns {Array} 筛选后的动画片数组
 * 
 * @example
 * const disney = filterByCategory(null, '迪士尼经典');
 * console.log('迪士尼动画片:', disney.length);
 */
function filterByCategory(cartoons, category) {
    if (!category) {
        return cartoons || getAllCartoons();
    }
    
    const source = cartoons || getAllCartoons();
    return source.filter(cartoon => cartoon.category === category);
}

/**
 * 按年代筛选动画片
 * @param {Array} cartoons - 动画片数组（可选，默认使用全部数据）
 * @param {string|number} decade - 年代（如 '1980' 或 1980）
 * @returns {Array} 筛选后的动画片数组
 * 
 * @example
 * const cartoons80s = filterByYear(null, '1980');
 * console.log('80年代动画片:', cartoons80s.length);
 */
function filterByYear(cartoons, decade) {
    if (!decade || decade === 'all') {
        return cartoons || getAllCartoons();
    }
    
    const source = cartoons || getAllCartoons();
    const decadeNum = typeof decade === 'string' ? parseInt(decade, 10) : decade;
    
    return source.filter(cartoon => {
        if (!cartoon.year) return false;
        const cartoonDecade = Math.floor(cartoon.year / 10) * 10;
        return cartoonDecade === decadeNum;
    });
}

/**
 * 按标签筛选动画片
 * @param {Array} cartoons - 动画片数组（可选，默认使用全部数据）
 * @param {string} tag - 标签名称
 * @returns {Array} 筛选后的动画片数组
 * 
 * @example
 * const comedy = filterByTag(null, '喜剧');
 * console.log('喜剧动画片:', comedy.length);
 */
function filterByTag(cartoons, tag) {
    if (!tag) {
        return cartoons || getAllCartoons();
    }
    
    const source = cartoons || getAllCartoons();
    const lowerTag = tag.toLowerCase();
    
    return source.filter(cartoon => {
        if (!cartoon.tags || !Array.isArray(cartoon.tags)) {
            return false;
        }
        return cartoon.tags.some(t => t.toLowerCase() === lowerTag);
    });
}

// ================= 数据排序 =================

/**
 * 按评分排序动画片
 * @param {Array} cartoons - 动画片数组
 * @param {string} order - 排序顺序：'desc'（降序，默认）或 'asc'（升序）
 * @returns {Array} 排序后的动画片数组（新数组，不修改原数组）
 * 
 * @example
 * const sorted = sortByRating(getAllCartoons(), 'desc');
 * console.log('评分最高的动画片:', sorted[0].title);
 */
function sortByRating(cartoons, order = 'desc') {
    if (!Array.isArray(cartoons)) {
        return [];
    }
    
    const sorted = [...cartoons].sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return order === 'desc' ? ratingB - ratingA : ratingA - ratingB;
    });
    
    return sorted;
}

/**
 * 按年份排序动画片
 * @param {Array} cartoons - 动画片数组
 * @param {string} order - 排序顺序：'desc'（降序，默认）或 'asc'（升序）
 * @returns {Array} 排序后的动画片数组（新数组，不修改原数组）
 * 
 * @example
 * const sorted = sortByYear(getAllCartoons(), 'desc');
 * console.log('最新的动画片:', sorted[0].title);
 */
function sortByYear(cartoons, order = 'desc') {
    if (!Array.isArray(cartoons)) {
        return [];
    }
    
    const sorted = [...cartoons].sort((a, b) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        return order === 'desc' ? yearB - yearA : yearA - yearB;
    });
    
    return sorted;
}

// ================= 数据搜索 =================

/**
 * 搜索动画片
 * 在标题、导演、标签、简介中搜索，不区分大小写
 * @param {Array} cartoons - 动画片数组（可选，默认使用全部数据）
 * @param {string} keyword - 搜索关键词
 * @returns {Array} 匹配的动画片数组
 * 
 * @example
 * const results = searchCartoons(null, '猫');
 * console.log('搜索结果:', results.length);
 */
function searchCartoons(cartoons, keyword) {
    if (!keyword || typeof keyword !== 'string') {
        return [];
    }
    
    const source = cartoons || getAllCartoons();
    const lowerKeyword = keyword.toLowerCase().trim();
    
    if (!lowerKeyword) {
        return [];
    }
    
    return source.filter(cartoon => {
        // 搜索标题（中文和英文）
        const titleMatch = (cartoon.title && cartoon.title.toLowerCase().includes(lowerKeyword)) ||
                          (cartoon.englishTitle && cartoon.englishTitle.toLowerCase().includes(lowerKeyword));
        
        // 搜索导演
        const directorMatch = cartoon.director && cartoon.director.toLowerCase().includes(lowerKeyword);
        
        // 搜索标签
        const tagsMatch = cartoon.tags && Array.isArray(cartoon.tags) && 
                         cartoon.tags.some(tag => tag.toLowerCase().includes(lowerKeyword));
        
        // 搜索简介
        const descMatch = cartoon.description && cartoon.description.toLowerCase().includes(lowerKeyword);
        
        return titleMatch || directorMatch || tagsMatch || descMatch;
    });
}

// ================= 收藏管理 =================

/**
 * 获取收藏列表
 * @returns {Array} 收藏的动画片ID数组
 * 
 * @example
 * const collections = getCollections();
 * console.log('收藏了', collections.length, '部动画片');
 */
function getCollections() {
    try {
        const collection = localStorage.getItem(COLLECTION_KEY);
        return collection ? JSON.parse(collection) : [];
    } catch (e) {
        console.error('读取收藏列表失败:', e);
        return [];
    }
}

/**
 * 添加收藏
 * @param {number|string} cartoonId - 动画片ID
 * @returns {boolean} 是否添加成功
 * 
 * @example
 * if (addCollection(1)) {
 *   console.log('收藏成功');
 * }
 */
function addCollection(cartoonId) {
    try {
        const collection = getCollections();
        const numId = typeof cartoonId === 'string' ? parseInt(cartoonId, 10) : cartoonId;
        
        if (!collection.includes(numId)) {
            collection.push(numId);
            localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
            return true;
        }
        return false;
    } catch (e) {
        console.error('添加收藏失败:', e);
        return false;
    }
}

/**
 * 移除收藏
 * @param {number|string} cartoonId - 动画片ID
 * @returns {boolean} 是否移除成功
 * 
 * @example
 * if (removeCollection(1)) {
 *   console.log('取消收藏成功');
 * }
 */
function removeCollection(cartoonId) {
    try {
        const collection = getCollections();
        const numId = typeof cartoonId === 'string' ? parseInt(cartoonId, 10) : cartoonId;
        const index = collection.indexOf(numId);
        
        if (index > -1) {
            collection.splice(index, 1);
            localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
            return true;
        }
        return false;
    } catch (e) {
        console.error('移除收藏失败:', e);
        return false;
    }
}

/**
 * 检查是否已收藏
 * @param {number|string} cartoonId - 动画片ID
 * @returns {boolean} 是否已收藏
 * 
 * @example
 * if (isCollected(1)) {
 *   console.log('已收藏');
 * }
 */
function isCollected(cartoonId) {
    const collection = getCollections();
    const numId = typeof cartoonId === 'string' ? parseInt(cartoonId, 10) : cartoonId;
    return collection.includes(numId);
}

/**
 * 获取收藏的动画片详情
 * @returns {Array} 收藏的动画片对象数组
 * 
 * @example
 * const collected = getCollectedCartoons();
 * console.log('收藏的动画片:', collected);
 */
function getCollectedCartoons() {
    const collection = getCollections();
    return collection.map(id => getCartoonById(id)).filter(cartoon => cartoon !== null);
}

// ================= 播放历史 =================

/**
 * 保存播放进度
 * @param {number|string} cartoonId - 动画片ID
 * @param {number|string} episodeNumber - 剧集编号
 * @param {number} currentTime - 当前播放时间（秒）
 * @returns {boolean} 是否保存成功
 * 
 * @example
 * saveProgress(1, 1, 120); // 保存第1部动画片的第1集，播放到120秒
 */
function saveProgress(cartoonId, episodeNumber, currentTime) {
    try {
        const numId = typeof cartoonId === 'string' ? parseInt(cartoonId, 10) : cartoonId;
        const numEpisode = typeof episodeNumber === 'string' ? parseInt(episodeNumber, 10) : episodeNumber;
        const key = `${PROGRESS_KEY_PREFIX}${numId}_${numEpisode}`;
        
        const progress = {
            cartoonId: numId,
            episodeNumber: numEpisode,
            currentTime: currentTime,
            timestamp: Date.now()
        };
        
        localStorage.setItem(key, JSON.stringify(progress));
        
        // 同时更新播放历史
        updateHistory(numId, numEpisode);
        
        return true;
    } catch (e) {
        console.error('保存播放进度失败:', e);
        return false;
    }
}

/**
 * 获取播放进度
 * @param {number|string} cartoonId - 动画片ID
 * @param {number|string} episodeNumber - 剧集编号
 * @returns {Object|null} 播放进度对象，如果不存在则返回null
 * 
 * @example
 * const progress = getProgress(1, 1);
 * if (progress) {
 *   console.log('上次播放到:', progress.currentTime, '秒');
 * }
 */
function getProgress(cartoonId, episodeNumber) {
    try {
        const numId = typeof cartoonId === 'string' ? parseInt(cartoonId, 10) : cartoonId;
        const numEpisode = typeof episodeNumber === 'string' ? parseInt(episodeNumber, 10) : episodeNumber;
        const key = `${PROGRESS_KEY_PREFIX}${numId}_${numEpisode}`;
        
        const saved = localStorage.getItem(key);
        if (saved) {
            const progress = JSON.parse(saved);
            // 如果保存的时间超过24小时，返回null
            if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
                return progress;
            }
        }
        return null;
    } catch (e) {
        console.error('获取播放进度失败:', e);
        return null;
    }
}

/**
 * 更新播放历史
 * @param {number|string} cartoonId - 动画片ID
 * @param {number|string} episodeNumber - 剧集编号
 */
function updateHistory(cartoonId, episodeNumber) {
    try {
        const history = getHistory();
        const numId = typeof cartoonId === 'string' ? parseInt(cartoonId, 10) : cartoonId;
        const numEpisode = typeof episodeNumber === 'string' ? parseInt(episodeNumber, 10) : episodeNumber;
        
        // 移除已存在的记录
        const filtered = history.filter(item => 
            !(item.cartoonId === numId && item.episodeNumber === numEpisode)
        );
        
        // 添加到开头
        filtered.unshift({
            cartoonId: numId,
            episodeNumber: numEpisode,
            timestamp: Date.now()
        });
        
        // 只保留最近50条记录
        const limited = filtered.slice(0, 50);
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
    } catch (e) {
        console.error('更新播放历史失败:', e);
    }
}

/**
 * 获取观看历史
 * @returns {Array} 观看历史数组，按时间倒序
 * 
 * @example
 * const history = getHistory();
 * console.log('最近观看:', history);
 */
function getHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error('获取播放历史失败:', e);
        return [];
    }
}

// ================= 工具函数 =================

/**
 * 格式化时长（秒转为 MM:SS 或 HH:MM:SS）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串
 * 
 * @example
 * formatDuration(125); // "02:05"
 * formatDuration(3665); // "01:01:05"
 */
function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return '00:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 格式化日期
 * @param {Date|number|string} date - 日期对象、时间戳或日期字符串
 * @param {string} format - 格式字符串（默认：'YYYY-MM-DD'）
 * @returns {string} 格式化后的日期字符串
 * 
 * @example
 * formatDate(new Date()); // "2025-01-15"
 * formatDate(Date.now(), 'YYYY年MM月DD日'); // "2025年01月15日"
 */
function formatDate(date, format = 'YYYY-MM-DD') {
    try {
        let d;
        if (date instanceof Date) {
            d = date;
        } else if (typeof date === 'number') {
            d = new Date(date);
        } else if (typeof date === 'string') {
            d = new Date(date);
        } else {
            return '';
        }
        
        if (isNaN(d.getTime())) {
            return '';
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    } catch (e) {
        console.error('格式化日期失败:', e);
        return '';
    }
}

/**
 * 生成随机ID
 * @param {number} length - ID长度（默认：8）
 * @returns {string} 随机ID字符串
 * 
 * @example
 * const id = generateId(); // "a3f5b2c1"
 * const longId = generateId(16); // "a3f5b2c1d4e6f7g8"
 */
function generateId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 * 
 * @example
 * const debouncedSearch = debounce((keyword) => {
 *   console.log('搜索:', keyword);
 * }, 300);
 * 
 * input.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 */
function debounce(func, delay) {
    if (typeof func !== 'function') {
        throw new Error('第一个参数必须是函数');
    }
    if (typeof delay !== 'number' || delay < 0) {
        throw new Error('第二个参数必须是正数');
    }
    
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, delay);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('滚动事件');
 * }, 100);
 * 
 * window.addEventListener('scroll', throttledScroll);
 */
function throttle(func, limit) {
    if (typeof func !== 'function') {
        throw new Error('第一个参数必须是函数');
    }
    if (typeof limit !== 'number' || limit < 0) {
        throw new Error('第二个参数必须是正数');
    }
    
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ================= 数据验证 =================

/**
 * 验证动画片数据格式
 * @param {Object} cartoon - 动画片对象
 * @returns {boolean} 数据是否有效
 * 
 * @example
 * if (validateCartoon(cartoon)) {
 *   console.log('数据有效');
 * }
 */
function validateCartoon(cartoon) {
    if (!cartoon || typeof cartoon !== 'object') {
        return false;
    }
    
    // 必需字段
    if (!cartoon.id || typeof cartoon.id !== 'number') {
        return false;
    }
    
    if (!cartoon.title || typeof cartoon.title !== 'string' || cartoon.title.trim() === '') {
        return false;
    }
    
    // 可选字段验证
    if (cartoon.year && (typeof cartoon.year !== 'number' || cartoon.year < 1900 || cartoon.year > 2100)) {
        return false;
    }
    
    if (cartoon.rating && (typeof cartoon.rating !== 'number' || cartoon.rating < 0 || cartoon.rating > 10)) {
        return false;
    }
    
    if (cartoon.tags && !Array.isArray(cartoon.tags)) {
        return false;
    }
    
    if (cartoon.episodes && !Array.isArray(cartoon.episodes)) {
        return false;
    }
    
    return true;
}

// ================= 兼容旧函数 =================

// 兼容旧函数名
function getCartoonsByCategory(category) {
    return filterByCategory(null, category);
}

// 兼容旧函数名（已在 collection.js 中定义，这里不重复）
// function isInCollection(cartoonId) {
//     return isCollected(cartoonId);
// }

// ================= 评论管理 =================

/**
 * 获取评论列表
 * @param {number} cartoonId - 动画片ID
 * @returns {Array} 评论列表
 * 
 * @example
 * const comments = getComments(1);
 * console.log('评论数量:', comments.length);
 */
function getComments(cartoonId) {
    try {
        const key = COMMENTS_KEY_PREFIX + cartoonId;
        const commentsJson = localStorage.getItem(key);
        if (commentsJson) {
            const comments = JSON.parse(commentsJson);
            // 按时间倒序排序（最新的在前）
            return comments.sort((a, b) => b.timestamp - a.timestamp);
        }
        return [];
    } catch (e) {
        console.error('读取评论失败:', e);
        return [];
    }
}

/**
 * 添加评论
 * @param {number} cartoonId - 动画片ID
 * @param {string} content - 评论内容
 * @param {string} username - 用户名（可选，默认为"游客"）
 * @returns {Object|null} 新创建的评论对象，失败返回null
 * 
 * @example
 * const comment = addComment(1, '这个动画片真好看！', '小明');
 * if (comment) {
 *   console.log('评论已添加:', comment.id);
 * }
 */
function addComment(cartoonId, content, username = '游客') {
    if (!cartoonId || !content || !content.trim()) {
        console.warn('评论参数无效');
        return null;
    }
    
    try {
        const comments = getComments(cartoonId);
        const newComment = {
            id: generateId(16),
            username: username.trim() || '游客',
            content: content.trim(),
            timestamp: Date.now(),
            likes: 0,
            likedBy: [] // 记录点赞的用户（简单实现，实际应该用用户ID）
        };
        
        comments.push(newComment);
        
        const key = COMMENTS_KEY_PREFIX + cartoonId;
        localStorage.setItem(key, JSON.stringify(comments));
        
        console.log('评论已添加:', newComment.id);
        return newComment;
    } catch (e) {
        console.error('添加评论失败:', e);
        return null;
    }
}

/**
 * 删除评论
 * @param {number} cartoonId - 动画片ID
 * @param {string} commentId - 评论ID
 * @returns {boolean} 是否删除成功
 * 
 * @example
 * const success = deleteComment(1, 'comment123');
 * if (success) {
 *   console.log('评论已删除');
 * }
 */
function deleteComment(cartoonId, commentId) {
    try {
        const comments = getComments(cartoonId);
        const filtered = comments.filter(c => c.id !== commentId);
        
        if (filtered.length === comments.length) {
            console.warn('未找到要删除的评论');
            return false;
        }
        
        const key = COMMENTS_KEY_PREFIX + cartoonId;
        localStorage.setItem(key, JSON.stringify(filtered));
        
        console.log('评论已删除:', commentId);
        return true;
    } catch (e) {
        console.error('删除评论失败:', e);
        return false;
    }
}

/**
 * 点赞/取消点赞评论
 * @param {number} cartoonId - 动画片ID
 * @param {string} commentId - 评论ID
 * @param {string} userId - 用户ID（可选，默认为"user_" + 时间戳）
 * @returns {Object|null} 更新后的评论对象，失败返回null
 * 
 * @example
 * const comment = toggleCommentLike(1, 'comment123');
 * if (comment) {
 *   console.log('点赞数:', comment.likes);
 * }
 */
function toggleCommentLike(cartoonId, commentId, userId = null) {
    try {
        const comments = getComments(cartoonId);
        const comment = comments.find(c => c.id === commentId);
        
        if (!comment) {
            console.warn('未找到评论');
            return null;
        }
        
        // 生成用户ID（简单实现，实际应该从登录系统获取）
        if (!userId) {
            userId = 'user_' + (localStorage.getItem('user_id') || Date.now());
            localStorage.setItem('user_id', userId);
        }
        
        // 检查是否已点赞
        const likedIndex = comment.likedBy ? comment.likedBy.indexOf(userId) : -1;
        
        if (likedIndex >= 0) {
            // 取消点赞
            comment.likedBy.splice(likedIndex, 1);
            comment.likes = Math.max(0, comment.likes - 1);
        } else {
            // 点赞
            if (!comment.likedBy) {
                comment.likedBy = [];
            }
            comment.likedBy.push(userId);
            comment.likes = (comment.likes || 0) + 1;
        }
        
        const key = COMMENTS_KEY_PREFIX + cartoonId;
        localStorage.setItem(key, JSON.stringify(comments));
        
        console.log('点赞状态已更新:', comment.likes);
        return comment;
    } catch (e) {
        console.error('点赞评论失败:', e);
        return null;
    }
}

/**
 * 检查用户是否已点赞评论
 * @param {number} cartoonId - 动画片ID
 * @param {string} commentId - 评论ID
 * @param {string} userId - 用户ID（可选）
 * @returns {boolean} 是否已点赞
 */
function isCommentLiked(cartoonId, commentId, userId = null) {
    try {
        const comments = getComments(cartoonId);
        const comment = comments.find(c => c.id === commentId);
        
        if (!comment || !comment.likedBy) {
            return false;
        }
        
        if (!userId) {
            userId = localStorage.getItem('user_id') || 'user_' + Date.now();
        }
        
        return comment.likedBy.indexOf(userId) >= 0;
    } catch (e) {
        console.error('检查点赞状态失败:', e);
        return false;
    }
}

// ================= 初始化 =================

// 页面加载时自动加载数据
document.addEventListener('DOMContentLoaded', function() {
    loadCartoons().catch(error => {
        console.error('初始化加载数据失败:', error);
    });
});
