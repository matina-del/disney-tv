// 主要逻辑文件
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initPage();
});

function initPage() {
    // 根据当前页面执行相应的初始化逻辑
    const currentPage = window.location.pathname.split('/').pop();
    
    switch(currentPage) {
        case 'index.html':
        case '':
            initHomePage();
            break;
        case 'category.html':
            initCategoryPage();
            break;
        case 'search.html':
            initSearchPage();
            break;
        case 'collection.html':
            initCollectionPage();
            break;
    }
}

function initHomePage() {
    // 首页初始化逻辑
    loadCartoonsData().then((data) => {
        console.log('数据加载完成，共', data ? data.length : 0, '条');
        const all = getAllCartoons();
        console.log('获取所有动画片，共', all ? all.length : 0, '条');
        
        if (!Array.isArray(all) || all.length === 0) {
            console.warn('没有动画片数据，请检查：');
            console.warn('1. data/cartoons.json 文件是否存在');
            console.warn('2. 是否使用本地服务器运行（直接打开HTML会有CORS问题）');
            console.warn('3. 浏览器控制台是否有错误信息');
            return;
        }

        // 排序取前N
        const byRatingDesc = [...all].sort((a, b) => (b.rating || 0) - (a.rating || 0));

        // 轮播：评分最高的5个
        const topSlides = byRatingDesc.slice(0, 5);
        console.log('渲染轮播图，共', topSlides.length, '个');
        renderCarousel(topSlides);

        // 热门推荐：评分最高的8个
        const hot = byRatingDesc.slice(0, 8);
        console.log('渲染热门推荐，共', hot.length, '个');
        renderCards(hot, document.getElementById('hot-list'));

        // 分类展示：各取4个
        renderCategory('迪士尼经典', 'list-disney', all, 4);
        renderCategory('华纳兄弟', 'list-warner', all, 4);
        renderCategory('经典国产', 'list-china', all, 4);
    }).catch(error => {
        console.error('首页初始化失败:', error);
    });
}

function initCategoryPage() {
    // 分类页初始化逻辑
    const url = new URL(window.location.href);
    const initCategory = url.searchParams.get('category') || '迪士尼经典';
    const state = {
        category: initCategory,
        decade: 'all',
        sort: 'default',
        page: 1,
        pageSize: 12,
        allItems: [],
        filtered: []
    };

    // 加载数据
    loadCartoonsData().then(() => {
        state.allItems = getAllCartoons();
        setupCategoryUI(state);
        applyFiltersAndRender(state);
    });
}

function initSearchPage() {
    // 搜索页初始化逻辑
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    // 初始化热门搜索
    initHotSearch();
    
    // 初始化搜索框
    initSearchInputs();
    
    if (query && query.trim()) {
        performSearch(query.trim());
    } else {
        // 显示热门搜索
        showHotSearch();
    }
}

// 初始化搜索输入框（带防抖）
function initSearchInputs() {
    // 防抖函数（如果 performance.js 已加载则使用，否则使用本地版本）
    const debounceFunc = typeof debounce === 'function' ? debounce : function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
    
    // 主搜索框
    const mainInput = document.getElementById('main-search-input');
    const mainForm = document.getElementById('main-search-form');
    
    if (mainInput && mainForm) {
        // 从URL参数填充搜索框
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            mainInput.value = query;
        }
        
        // 表单提交
        mainForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = mainInput.value.trim();
            if (keyword) {
                searchAndNavigate(keyword);
            }
        });
        
        // 输入防抖（实时搜索提示，可选）
        const debouncedSearch = debounceFunc((value) => {
            // 这里可以添加实时搜索提示功能
            // console.log('搜索提示:', value);
        }, 300);
        
        mainInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    // 导航栏搜索框
    const navInput = document.getElementById('nav-search-input');
    if (navInput) {
        navInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const keyword = navInput.value.trim();
                if (keyword) {
                    searchAndNavigate(keyword);
                }
            }
        });
    }
}

// 搜索并导航
function searchAndNavigate(keyword) {
    window.location.href = `search.html?q=${encodeURIComponent(keyword)}`;
}

// 初始化热门搜索
function initHotSearch() {
    const hotTags = document.getElementById('hot-search-tags');
    if (!hotTags) return;
    
    // 热门搜索词
    const hotKeywords = ['猫和老鼠', '白雪公主', '葫芦兄弟', '米老鼠', '狮子王', '小鹿斑比', '灰姑娘', '黑猫警长'];
    
    hotTags.innerHTML = hotKeywords.map(keyword => 
        `<span class="hot-search-tag" data-keyword="${keyword}">${keyword}</span>`
    ).join('');
    
    // 绑定点击事件
    hotTags.querySelectorAll('.hot-search-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const keyword = tag.getAttribute('data-keyword');
            // 自动填入搜索框
            const mainInput = document.getElementById('main-search-input');
            if (mainInput) {
                mainInput.value = keyword;
            }
            // 执行搜索
            searchAndNavigate(keyword);
        });
    });
}

// 显示热门搜索
function showHotSearch() {
    document.getElementById('hot-search-section').style.display = 'block';
    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('no-results-section').style.display = 'none';
}

// 执行搜索
function performSearch(query) {
    // 隐藏热门搜索
    document.getElementById('hot-search-section').style.display = 'none';
    
    // 加载数据
    loadCartoonsData().then(() => {
        const allCartoons = getAllCartoons();
        
        // 执行搜索
        const results = searchCartoons(allCartoons, query);
        
        // 显示搜索结果
        displaySearchResults(results, query);
    });
}

// 搜索动画片（在标题、导演、标签、简介中搜索）
function searchCartoons(cartoons, keyword) {
    if (!keyword || !keyword.trim()) {
        return [];
    }
    
    const lowerKeyword = keyword.toLowerCase().trim();
    
    return cartoons.filter(cartoon => {
        // 搜索标题（中文和英文）
        const titleMatch = (cartoon.title && cartoon.title.toLowerCase().includes(lowerKeyword)) ||
                          (cartoon.englishTitle && cartoon.englishTitle.toLowerCase().includes(lowerKeyword));
        
        // 搜索导演
        const directorMatch = cartoon.director && cartoon.director.toLowerCase().includes(lowerKeyword);
        
        // 搜索标签
        const tagsMatch = cartoon.tags && cartoon.tags.some(tag => 
            tag.toLowerCase().includes(lowerKeyword)
        );
        
        // 搜索简介
        const descMatch = cartoon.description && cartoon.description.toLowerCase().includes(lowerKeyword);
        
        return titleMatch || directorMatch || tagsMatch || descMatch;
    });
}

// 显示搜索结果
function displaySearchResults(results, keyword) {
    const resultsSection = document.getElementById('search-results-section');
    const noResultsSection = document.getElementById('no-results-section');
    const keywordEl = document.getElementById('search-keyword');
    const countEl = document.getElementById('search-count');
    const gridEl = document.getElementById('search-results-grid');
    
    // 按评分排序
    results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    if (results.length === 0) {
        // 显示无结果状态
        resultsSection.style.display = 'none';
        noResultsSection.style.display = 'block';
    } else {
        // 显示搜索结果
        resultsSection.style.display = 'block';
        noResultsSection.style.display = 'none';
        
        // 更新关键词和数量
        if (keywordEl) {
            keywordEl.textContent = `搜索结果：${keyword}`;
        }
        if (countEl) {
            countEl.textContent = `找到${results.length}部动画片`;
        }
        
        // 渲染搜索结果
        if (gridEl) {
            gridEl.innerHTML = results.map(cartoon => 
                searchResultCardHTML(cartoon, keyword)
            ).join('');
            
            // 绑定点击事件
            gridEl.querySelectorAll('.search-result-card').forEach(card => {
                card.addEventListener('click', () => {
                    const cardId = card.getAttribute('data-card-id');
                    gotoVideo(cardId);
                });
            });
        }
    }
}

// 搜索结果卡片HTML（带关键词高亮）
function searchResultCardHTML(cartoon, keyword) {
    const cover = cartoon.cover || 'https://via.placeholder.com/400x225/8B4513/FFF8DC?text=No+Image';
    const title = highlightKeyword(cartoon.title || '', keyword);
    const year = cartoon.year || '';
    const rating = Number(cartoon.rating || 0);
    const stars = ratingToStars(rating);
    
    return `<div class="card search-result-card" data-card-id="${cartoon.id}">
        <div class="card-cover">
            <img src="${cover}" alt="${cartoon.title}" 
                 onerror="console.error('图片加载失败:', '${cover}'); this.style.display='none'; this.onerror=null;">
        </div>
        <div class="card-body">
            <div class="card-title">${title}</div>
            <div class="card-meta">
                <span>${year}</span>
                <span class="stars" title="评分：${rating}">${stars}</span>
            </div>
        </div>
    </div>`;
}

// 高亮关键词
function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text;
    
    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// 转义正则表达式特殊字符
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function initCollectionPage() {
    // 收藏页初始化逻辑
    loadCartoonsData().then(() => {
        renderCollectionPage();
    });
}

// 渲染收藏页
function renderCollectionPage() {
    // 从LocalStorage读取收藏列表（使用cartoon_collections键名）
    const collectionKey = 'cartoon_collections';
    const collectionStr = localStorage.getItem(collectionKey);
    let collectionIds = [];
    
    if (collectionStr) {
        try {
            collectionIds = JSON.parse(collectionStr);
            console.log('收藏页：读取到收藏ID列表', collectionIds);
        } catch (e) {
            console.error('读取收藏列表失败:', e);
        }
    }
    
    // 兼容旧的键名
    if (collectionIds.length === 0) {
        const oldCollection = getCollection();
        if (oldCollection && oldCollection.length > 0) {
            collectionIds = oldCollection;
            console.log('收藏页：从旧键名读取到收藏ID列表', collectionIds);
            // 迁移到新键名
            localStorage.setItem(collectionKey, JSON.stringify(collectionIds));
        }
    }
    
    // 获取所有动画片数据
    const allCartoons = getAllCartoons();
    console.log('收藏页：所有动画片数量', allCartoons ? allCartoons.length : 0);
    
    // 筛选出收藏的动画片（确保ID类型匹配）
    const collectedCartoons = allCartoons.filter(cartoon => {
        // 将ID转换为数字进行比较
        const cartoonId = typeof cartoon.id === 'string' ? parseInt(cartoon.id, 10) : cartoon.id;
        const isCollected = collectionIds.some(id => {
            const numId = typeof id === 'string' ? parseInt(id, 10) : id;
            return numId === cartoonId;
        });
        if (isCollected) {
            console.log('收藏页：找到收藏的动画片', cartoon.title, 'ID:', cartoon.id);
        }
        return isCollected;
    });
    
    console.log('收藏页：筛选后的收藏动画片数量', collectedCartoons.length);
    
    // 更新收藏数量
    const countEl = document.getElementById('collection-count');
    if (countEl) {
        countEl.textContent = `共${collectedCartoons.length}部动画片`;
    }
    
    // 渲染收藏列表或空状态
    const listEl = document.getElementById('collection-list');
    const emptyEl = document.getElementById('empty-state');
    
    if (collectedCartoons.length === 0) {
        // 显示空状态
        if (listEl) listEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
    } else {
        // 显示收藏列表
        if (listEl) listEl.style.display = 'grid';
        if (emptyEl) emptyEl.style.display = 'none';
        
        // 渲染收藏卡片
        if (listEl) {
            listEl.innerHTML = collectedCartoons.map(cartoon => 
                collectionCardHTML(cartoon)
            ).join('');
            
            // 绑定点击事件
            listEl.querySelectorAll('.collection-card').forEach(card => {
                const cardId = card.getAttribute('data-card-id');
                card.addEventListener('click', (e) => {
                    // 如果点击的是取消收藏按钮，不跳转
                    if (e.target.closest('.remove-favorite-btn')) {
                        return;
                    }
                    gotoVideo(cardId);
                });
            });
            
            // 绑定取消收藏按钮事件
            listEl.querySelectorAll('.remove-favorite-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const cardId = parseInt(btn.getAttribute('data-remove-id'));
                    removeFromCollectionConfirm(cardId);
                });
            });
        }
    }
}

// 收藏卡片HTML
function collectionCardHTML(cartoon) {
    const cover = cartoon.cover || 'https://via.placeholder.com/400x225/8B4513/FFF8DC?text=No+Image';
    const title = cartoon.title || '';
    const year = cartoon.year || '';
    const rating = Number(cartoon.rating || 0);
    const stars = ratingToStars(rating);
    
    // 处理图片路径
    let imageSrc = cover;
    if (cover && !cover.startsWith('http') && !cover.startsWith('//')) {
        if (!cover.startsWith('images/')) {
            imageSrc = 'images/covers/' + cover;
        }
    }
    
    return `<div class="collection-card" data-card-id="${cartoon.id}">
        <div class="collection-card-cover">
            <img src="${imageSrc}" alt="${title}" 
                 loading="lazy"
                 onerror="console.error('图片加载失败:', '${imageSrc}'); this.style.display='none'; this.onerror=null;">
            <button class="remove-favorite-btn" data-remove-id="${cartoon.id}" title="取消收藏">×</button>
        </div>
        <div class="collection-card-body">
            <div class="collection-card-title">${title}</div>
            <div class="collection-card-meta">
                <span>${year}</span>
                <span class="collection-card-rating" title="评分：${rating}">${stars}</span>
            </div>
        </div>
    </div>`;
}

// 取消收藏确认
function removeFromCollectionConfirm(cartoonId) {
    if (confirm('确定要取消收藏吗？')) {
        // 从LocalStorage中删除
        const collectionKey = 'cartoon_collections';
        const collectionStr = localStorage.getItem(collectionKey);
        let collectionIds = [];
        
        if (collectionStr) {
            try {
                collectionIds = JSON.parse(collectionStr);
            } catch (e) {
                console.error('读取收藏列表失败:', e);
            }
        }
        
        // 移除ID
        const index = collectionIds.indexOf(cartoonId);
        if (index > -1) {
            collectionIds.splice(index, 1);
            localStorage.setItem(collectionKey, JSON.stringify(collectionIds));
            
            // 同时更新旧的键名（兼容性）
            removeFromCollection(cartoonId);
            
            // 重新渲染页面
            renderCollectionPage();
        }
    }
}

// ========== 分类页辅助函数 ==========
function setupCategoryUI(state) {
    // Tabs
    const tabsWrap = document.getElementById('category-tabs');
    if (tabsWrap) {
        tabsWrap.querySelectorAll('.tab-btn').forEach(btn => {
            const cat = btn.getAttribute('data-category');
            btn.classList.toggle('active', cat === state.category);
            btn.addEventListener('click', () => {
                state.category = cat;
                state.page = 1;
                updateCategoryURL(state);
                highlightActiveTab(state);
                applyFiltersAndRender(state);
            });
        });
    }

    // Decade filter
    const decadeWrap = document.getElementById('decade-options');
    if (decadeWrap) {
        decadeWrap.querySelectorAll('.filter-btn').forEach(btn => {
            const decade = btn.getAttribute('data-decade');
            btn.classList.toggle('active', decade === state.decade);
            btn.addEventListener('click', () => {
                state.decade = decade;
                state.page = 1;
                highlightActiveDecade(state);
                applyFiltersAndRender(state);
            });
        });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.value = state.sort;
        sortSelect.addEventListener('change', () => {
            state.sort = sortSelect.value;
            state.page = 1;
            applyFiltersAndRender(state);
        });
    }
}

function highlightActiveTab(state) {
    const tabsWrap = document.getElementById('category-tabs');
    if (!tabsWrap) return;
    tabsWrap.querySelectorAll('.tab-btn').forEach(btn => {
        const cat = btn.getAttribute('data-category');
        btn.classList.toggle('active', cat === state.category);
    });
}

function highlightActiveDecade(state) {
    const wrap = document.getElementById('decade-options');
    if (!wrap) return;
    wrap.querySelectorAll('.filter-btn').forEach(btn => {
        const decade = btn.getAttribute('data-decade');
        btn.classList.toggle('active', decade === state.decade);
    });
}

function updateCategoryURL(state) {
    const url = new URL(window.location.href);
    url.searchParams.set('category', state.category);
    window.history.replaceState({}, '', url);
}

function applyFiltersAndRender(state) {
    // 1) 分类
    let list = state.allItems.filter(i => i.category === state.category);

    // 2) 年代
    if (state.decade !== 'all') {
        const d = parseInt(state.decade, 10);
        list = list.filter(i => getDecade(i.year) === d);
    }

    // 3) 排序
    if (state.sort === 'rating_desc') {
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (state.sort === 'year_desc') {
        list.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (state.sort === 'year_asc') {
        list.sort((a, b) => (a.year || 0) - (b.year || 0));
    }

    state.filtered = list;

    // 4) 渲染激活筛选文案
    renderActiveFilters(state);

    // 5) 分页
    renderPagination(state);
    renderCategoryGrid(state);
}

function getDecade(year) {
    if (!year) return null;
    return Math.floor(year / 10) * 10; // 1986 -> 1980
}

function renderActiveFilters(state) {
    const el = document.getElementById('active-filters');
    if (!el) return;
    const decadeText = state.decade === 'all' ? '全部' : `${state.decade}s`;
    let sortText = '默认';
    if (state.sort === 'rating_desc') sortText = '评分最高';
    if (state.sort === 'year_desc') sortText = '年份最新';
    if (state.sort === 'year_asc') sortText = '年份最早';
    el.textContent = `分类：${state.category} ｜ 年代：${decadeText} ｜ 排序：${sortText}`;
}

function renderCategoryGrid(state) {
    const grid = document.getElementById('category-grid');
    if (!grid) return;
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.filtered.slice(start, end);
    grid.innerHTML = pageItems.map(item => cardHTML(item)).join('');
    grid.querySelectorAll('[data-card-id]')?.forEach(el => {
        el.addEventListener('click', () => gotoVideo(el.getAttribute('data-card-id')));
    });
}

function renderPagination(state) {
    const wrap = document.getElementById('pagination');
    if (!wrap) return;
    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const parts = [];
    // Prev
    parts.push(`<button class="page-btn" data-page="prev" ${state.page === 1 ? 'disabled' : ''}>上一页</button>`);
    // Numbers (限制显示最多7个)
    const maxNums = 7;
    let start = Math.max(1, state.page - Math.floor(maxNums / 2));
    let end = Math.min(totalPages, start + maxNums - 1);
    start = Math.max(1, Math.min(start, Math.max(1, end - maxNums + 1)));
    for (let p = start; p <= end; p++) {
        parts.push(`<button class="page-btn ${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`);
    }
    // Next
    parts.push(`<button class="page-btn" data-page="next" ${state.page === totalPages ? 'disabled' : ''}>下一页</button>`);

    wrap.innerHTML = parts.join('');

    wrap.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.getAttribute('data-page');
            if (p === 'prev' && state.page > 1) state.page--;
            else if (p === 'next' && state.page < totalPages) state.page++;
            else if (!isNaN(parseInt(p))) state.page = parseInt(p);
            renderPagination(state);
            renderCategoryGrid(state);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ========== 渲染与交互工具 ==========

function gotoVideo(id) {
    window.location.href = `video.html?id=${encodeURIComponent(id)}`;
}

function renderCards(items, container) {
    if (!container) return;
    container.innerHTML = items.map(item => cardHTML(item)).join('');
    // 事件绑定
    container.querySelectorAll('[data-card-id]')?.forEach(el => {
        el.addEventListener('click', () => gotoVideo(el.getAttribute('data-card-id')));
    });
    
    // 添加滚动动画类（如果性能优化已加载）
    if (typeof initScrollAnimations === 'function') {
        container.querySelectorAll('.card').forEach(card => {
            card.classList.add('fade-in-up');
        });
        initScrollAnimations();
    }
}

function cardHTML(item) {
    const cover = item.cover || '';
    const title = item.title || '';
    const year = item.year || '';
    const rating = Number(item.rating || 0);
    const stars = ratingToStars(rating);
    
    // 如果图片路径是本地路径，确保路径正确
    let imageSrc = cover;
    if (cover && !cover.startsWith('http') && !cover.startsWith('//')) {
        // 本地路径，确保以相对路径开头
        if (!cover.startsWith('images/')) {
            imageSrc = 'images/covers/' + cover;
        }
    }
    
    return `
    <div class="card" data-card-id="${item.id}">
        <div class="card-cover">
            <img src="${imageSrc}" alt="${title}" 
                 loading="lazy"
                 onerror="console.error('图片加载失败:', '${imageSrc}'); this.style.display='none'; this.onerror=null;">
        </div>
        <div class="card-body">
            <div class="card-title">${title}</div>
            <div class="card-meta"><span>${year}</span><span class="stars" title="评分：${rating}">${stars}</span></div>
        </div>
    </div>`;
}

function ratingToStars(rating) {
    // 5星制显示，半星用☆近似（简单方案）
    const five = Math.round((rating / 10) * 5 * 2) / 2; // 0-5, 0.5步进
    const full = Math.floor(five);
    const half = five - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    // 使用实心★和空心☆
    return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}

function renderCategory(categoryName, containerId, allItems, count) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = allItems.filter(i => i.category === categoryName)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, count);
    renderCards(list, container);
}

// ========== 轮播 ==========
let carouselIndex = 0;
let carouselTimer = null;

function renderCarousel(items) {
    const slidesWrap = document.getElementById('carousel-slides');
    const dotsWrap = document.getElementById('carousel-dots');
    if (!slidesWrap || !dotsWrap) return;

    slidesWrap.innerHTML = items.map((item, idx) => {
        // 处理图片路径，确保本地路径正确
        let cover = item.cover || 'https://via.placeholder.com/1200x400/8B4513/FFF8DC?text=' + encodeURIComponent(item.title || 'No+Image');
        if (cover && !cover.startsWith('http') && !cover.startsWith('//')) {
            // 本地路径，确保以相对路径开头
            if (!cover.startsWith('images/')) {
                cover = 'images/covers/' + cover;
            }
        }
        
        return `
        <div class="carousel-slide${idx===0?' active':''}" data-index="${idx}" data-id="${item.id}">
            <img src="${cover}" alt="${item.title}" 
                 loading="eager"
                 onerror="console.error('轮播图图片加载失败:', '${cover}'); this.style.display='none'; this.onerror=null;">
            <div class="carousel-caption">
                <span>${item.title}</span>
                <span>${item.year}</span>
            </div>
        </div>
    `;
    }).join('');

    dotsWrap.innerHTML = items.map((_, idx) => `
        <div class="carousel-dot${idx===0?' active':''}" data-dot="${idx}"></div>
    `).join('');

    // 点击跳视频
    slidesWrap.querySelectorAll('.carousel-slide').forEach(el => {
        el.addEventListener('click', () => gotoVideo(el.getAttribute('data-id')));
    });

    // 箭头
    const prev = document.getElementById('carousel-prev');
    const next = document.getElementById('carousel-next');
    prev?.addEventListener('click', () => moveCarousel(items.length, -1));
    next?.addEventListener('click', () => moveCarousel(items.length, 1));

    // 圆点
    dotsWrap.querySelectorAll('.carousel-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = Number(dot.getAttribute('data-dot')) || 0;
            goCarousel(items.length, idx);
        });
    });

    carouselIndex = 0;
    updateCarouselTransform();
    startCarousel(items.length);
}

function moveCarousel(total, step) {
    carouselIndex = (carouselIndex + step + total) % total;
    updateCarouselTransform();
    restartCarousel(total);
}

function goCarousel(total, idx) {
    carouselIndex = ((idx % total) + total) % total;
    updateCarouselTransform();
    restartCarousel(total);
}

function updateCarouselTransform() {
    const wrap = document.getElementById('carousel-slides');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!wrap) return;
    
    // 切换激活态，配合淡入淡出
    const slides = wrap.querySelectorAll('.carousel-slide');
    slides.forEach((s, i) => {
        if (i === carouselIndex) {
            s.classList.add('active');
            s.style.opacity = '1';
            s.style.zIndex = '2';
        } else {
            s.classList.remove('active');
            s.style.opacity = '0';
            s.style.zIndex = '1';
        }
    });
    
    dots.forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
}

function startCarousel(total) {
    stopCarousel();
    carouselTimer = setInterval(() => {
        moveCarousel(total, 1);
    }, 3000); // 3秒
}

function stopCarousel() {
    if (carouselTimer) {
        clearInterval(carouselTimer);
        carouselTimer = null;
    }
}

function restartCarousel(total) {
    stopCarousel();
    startCarousel(total);
}

