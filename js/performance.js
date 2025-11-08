// 性能优化代码

// ================= 数据缓存 =================
const CACHE_KEY = 'cartoons_data_cache';
const CACHE_TIMESTAMP_KEY = 'cartoons_data_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 从缓存获取数据
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
                clearCache();
            }
        }
    } catch (e) {
        console.error('读取缓存失败:', e);
        clearCache();
    }
    return null;
}

// 保存数据到缓存
function setCachedData(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
        console.error('保存缓存失败:', e);
    }
}

// 清除缓存
function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

// 修改原有的 loadCartoonsData 函数（在 data.js 中）
// 这里提供一个增强版本
async function loadCartoonsDataWithCache() {
    // 先尝试从缓存获取
    const cached = getCachedData();
    if (cached) {
        cartoonsData = cached;
        return cached;
    }
    
    // 缓存未命中，从服务器加载
    try {
        const response = await fetch('data/cartoons.json');
        if (response.ok) {
            const data = await response.json();
            cartoonsData = data;
            // 保存到缓存
            setCachedData(data);
            return data;
        } else {
            console.error('加载数据失败:', response.status);
            return [];
        }
    } catch (error) {
        console.error('加载数据时出错:', error);
        return [];
    }
}

// ================= 防抖函数 =================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ================= 节流函数 =================
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ================= 图片懒加载 =================
function initLazyLoading() {
    // 使用 Intersection Observer API
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.add('loaded');
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px' // 提前50px开始加载
        });
        
        // 观察所有带 data-src 的图片
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // 降级方案：直接加载所有图片
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

// ================= 滚动动画（Intersection Observer） =================
function initScrollAnimations() {
    if ('IntersectionObserver' in window) {
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // 动画完成后可以停止观察
                    animationObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1, // 10%可见时触发
            rootMargin: '0px 0px -50px 0px'
        });
        
        // 观察所有需要动画的元素
        document.querySelectorAll('.fade-in-up').forEach(el => {
            animationObserver.observe(el);
        });
    }
}

// ================= 虚拟滚动（简化版） =================
class VirtualScroll {
    constructor(container, items, itemHeight, renderItem) {
        this.container = container;
        this.items = items;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.startIndex = 0;
        this.endIndex = this.visibleCount;
        
        this.init();
    }
    
    init() {
        this.container.addEventListener('scroll', throttle(() => {
            this.update();
        }, 16)); // 约60fps
        
        this.update();
    }
    
    update() {
        const scrollTop = this.container.scrollTop;
        const newStartIndex = Math.floor(scrollTop / this.itemHeight);
        const newEndIndex = Math.min(
            newStartIndex + this.visibleCount,
            this.items.length
        );
        
        if (newStartIndex !== this.startIndex || newEndIndex !== this.endIndex) {
            this.startIndex = newStartIndex;
            this.endIndex = newEndIndex;
            this.render();
        }
    }
    
    render() {
        const visibleItems = this.items.slice(this.startIndex, this.endIndex);
        const offsetY = this.startIndex * this.itemHeight;
        
        this.container.innerHTML = `
            <div style="height: ${this.items.length * this.itemHeight}px; position: relative;">
                <div style="position: absolute; top: ${offsetY}px;">
                    ${visibleItems.map((item, index) => 
                        this.renderItem(item, this.startIndex + index)
                    ).join('')}
                </div>
            </div>
        `;
    }
}

// ================= 性能监控 =================
function measurePerformance(name, fn) {
    if (window.performance && window.performance.mark) {
        const startMark = `${name}_start`;
        const endMark = `${name}_end`;
        
        performance.mark(startMark);
        const result = fn();
        performance.mark(endMark);
        
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        
        console.log(`${name} 耗时: ${measure.duration.toFixed(2)}ms`);
        
        return result;
    }
    return fn();
}

// ================= 初始化所有性能优化 =================
function initPerformanceOptimizations() {
    // 图片懒加载
    initLazyLoading();
    
    // 滚动动画
    initScrollAnimations();
    
    // 预加载关键资源
    preloadCriticalResources();
}

// ================= 预加载关键资源 =================
function preloadCriticalResources() {
    // 预加载字体（如果有）
    // 预加载关键图片
    const criticalImages = [
        // 可以添加关键图片路径
    ];
    
    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

// ================= 导出函数 =================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        initLazyLoading,
        initScrollAnimations,
        loadCartoonsDataWithCache,
        VirtualScroll,
        measurePerformance
    };
}


