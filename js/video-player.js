// Video.js 视频播放器功能
let currentCartoon = null;
let currentEpisodeIndex = 0;
let player = null;

document.addEventListener('DOMContentLoaded', function() {
    initVideoPlayer();
});

function initVideoPlayer() {
    // 从URL参数获取动画片ID
    const urlParams = new URLSearchParams(window.location.search);
    const cartoonId = urlParams.get('id');
    const episodeIndex = urlParams.get('episode') ? parseInt(urlParams.get('episode')) : 0;
    
    if (cartoonId) {
        loadCartoonData(cartoonId, episodeIndex);
    }
}

// 加载动画片数据
async function loadCartoonData(cartoonId, episodeIndex = 0) {
    await loadCartoonsData();
    const cartoon = getCartoonById(parseInt(cartoonId));
    
    if (!cartoon) {
        console.error('未找到动画片数据');
        return;
    }
    
    currentCartoon = cartoon;
    currentEpisodeIndex = episodeIndex;
    
    // 渲染视频信息
    renderVideoInfo(cartoon);
    
    // 初始化Video.js播放器
    initVideoJSPlayer(episodeIndex);
    
    // 渲染剧集列表
    renderEpisodes(cartoon);
    
    // 渲染相关推荐
    renderRelated(cartoon);
    
    // 初始化收藏状态
    updateFavoriteButton();
    
    // 初始化评论功能
    if (typeof initComments === 'function') {
        initComments(cartoon.id);
    }
}

// 初始化Video.js播放器
function initVideoJSPlayer(episodeIndex = 0) {
    // 等待DOM和Video.js库都加载完成
    if (typeof videojs === 'undefined') {
        console.warn('Video.js库未加载，等待中...');
        setTimeout(() => initVideoJSPlayer(episodeIndex), 100);
        return;
    }
    
    const videoElement = document.getElementById('video-player');
    if (!videoElement) {
        console.error('找不到视频播放器元素');
        setTimeout(() => initVideoJSPlayer(episodeIndex), 200);
        return;
    }
    
    // 获取当前剧集
    if (!currentCartoon || !currentCartoon.episodes || currentCartoon.episodes.length === 0) {
        console.warn('没有剧集数据');
        return;
    }
    
    if (episodeIndex < 0 || episodeIndex >= currentCartoon.episodes.length) {
        episodeIndex = 0;
    }
    
    currentEpisodeIndex = episodeIndex;
    const episode = currentCartoon.episodes[episodeIndex];
    
    if (!episode || !episode.videoUrl) {
        console.error('剧集数据无效或缺少videoUrl');
        return;
    }
    
    // 如果播放器已存在，先销毁
    if (player) {
        try {
            player.dispose();
            player = null;
        } catch (e) {
            console.warn('销毁播放器时出错:', e);
        }
    }
    
    // 如果videojs已经初始化过，先重置
    try {
        const existingPlayer = videojs.getPlayer('video-player');
        if (existingPlayer && !existingPlayer.isDisposed()) {
            existingPlayer.dispose();
        }
    } catch (e) {
        // 忽略错误，可能播放器不存在
    }
    
    // 确保video元素是干净的
    const videoEl = document.getElementById('video-player');
    if (videoEl) {
        // 移除可能存在的旧实例
        videoEl.removeAttribute('data-setup');
    }
    
    // 配置Video.js选项
    const playerOptions = {
        controls: true,
        autoplay: false,
        preload: 'metadata',
        responsive: true,
        fluid: true,
        language: 'zh-CN',
        playbackRates: [0.5, 1, 1.5, 2],
        html5: {
            vhs: {
                overrideNative: true
            },
            nativeVideoTracks: false,
            nativeAudioTracks: false,
            nativeTextTracks: false
        },
        sources: [{
            src: episode.videoUrl,
            type: 'video/mp4'
        }],
        poster: currentCartoon.cover || ''
    };
    
    // 初始化Video.js播放器
    try {
        player = videojs('video-player', playerOptions, function() {
            console.log('Video.js播放器初始化成功');
            
            const playerInstance = this;
            
            // 视频加载成功事件
            playerInstance.on('loadedmetadata', function() {
            console.log('视频元数据加载成功，时长:', playerInstance.duration());
            
            // 加载该集的播放进度
            loadPlayProgress();
        });
        
        // 视频可以播放事件
        playerInstance.on('canplay', function() {
            console.log('视频可以播放');
        });
        
        // 视频加载错误事件
        playerInstance.on('error', function() {
            const error = playerInstance.error();
            console.error('视频加载失败:', error);
            if (error) {
                console.error('错误代码:', error.code);
                console.error('错误信息:', error.message);
            }
            alert('视频加载失败，请检查网络连接或视频URL是否正确');
        });
        
        // 播放进度更新
        playerInstance.on('timeupdate', function() {
            savePlayProgress();
        });
        
        // 播放结束事件
        playerInstance.on('ended', function() {
            console.log('视频播放结束');
            // 可以在这里添加自动播放下一集的逻辑
        });
        
            // 全屏变化事件
            playerInstance.on('fullscreenchange', function() {
                console.log('全屏状态:', playerInstance.isFullscreen());
            });
        });
    } catch (error) {
        console.error('Video.js初始化失败:', error);
        alert('视频播放器初始化失败，请刷新页面重试');
        return;
    }
    
    // 更新URL参数
    const url = new URL(window.location);
    url.searchParams.set('episode', episodeIndex);
    window.history.replaceState({}, '', url);
    
    // 更新剧集列表高亮
    updateEpisodesHighlight();
}

// 加载剧集
function loadEpisode(index) {
    if (!currentCartoon || !currentCartoon.episodes || currentCartoon.episodes.length === 0) {
        console.warn('没有剧集数据');
        return;
    }
    
    if (index < 0 || index >= currentCartoon.episodes.length) {
        index = 0;
    }
    
    currentEpisodeIndex = index;
    const episode = currentCartoon.episodes[index];
    
    if (!episode || !episode.videoUrl) {
        console.error('剧集数据无效或缺少videoUrl');
        return;
    }
    
    if (!player) {
        console.error('播放器未初始化');
        return;
    }
    
    // 保存当前播放进度
    savePlayProgress();
    
    // 切换视频源
    player.src({
        type: 'video/mp4',
        src: episode.videoUrl
    });
    
    // 设置封面
    if (currentCartoon.cover) {
        player.poster(currentCartoon.cover);
    }
    
    // 加载视频
    player.load();
    
    // 更新URL参数
    const url = new URL(window.location);
    url.searchParams.set('episode', index);
    window.history.replaceState({}, '', url);
    
    // 更新剧集列表高亮
    updateEpisodesHighlight();
    
    // 加载该集的播放进度
    loadPlayProgress();
}

// 渲染视频信息
function renderVideoInfo(cartoon) {
    document.getElementById('video-title').textContent = cartoon.title;
    document.getElementById('video-year').textContent = cartoon.year || '';
    document.getElementById('video-director').textContent = cartoon.director || '';
    document.getElementById('video-description').textContent = cartoon.description || '';
    
    // 渲染评分
    const rating = cartoon.rating || 0;
    const stars = ratingToStars(rating);
    document.getElementById('video-rating').innerHTML = `<span class="stars">${stars}</span> ${rating.toFixed(1)}`;
}

// 评分转星星
function ratingToStars(rating) {
    const five = Math.round((rating / 10) * 5 * 2) / 2;
    const full = Math.floor(five);
    const half = five % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    // 使用实心★和空心☆
    return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}

// 渲染剧集列表
function renderEpisodes(cartoon) {
    const section = document.getElementById('episodes-section');
    const grid = document.getElementById('episodes-grid');
    
    if (!section || !grid) return;
    
    if (!cartoon.episodes || cartoon.episodes.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    if (cartoon.episodes.length === 1) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    grid.innerHTML = cartoon.episodes.map((ep, idx) => `
        <div class="episode-item ${idx === currentEpisodeIndex ? 'active' : ''}" 
             data-episode="${idx}" 
             onclick="loadEpisode(${idx})">
            <span class="episode-number">第${ep.episodeNumber}集</span>
            <span class="episode-title">${ep.title}</span>
            <span class="episode-duration">${ep.duration || ''}</span>
        </div>
    `).join('');
}

// 更新剧集列表高亮
function updateEpisodesHighlight() {
    const items = document.querySelectorAll('.episode-item');
    items.forEach((item, idx) => {
        if (idx === currentEpisodeIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 保存播放进度
function savePlayProgress() {
    if (!player || !currentCartoon) return;
    
    const currentTime = player.currentTime();
    const duration = player.duration();
    
    if (!currentTime || !duration || isNaN(currentTime) || isNaN(duration)) {
        return;
    }
    
    const progress = {
        cartoonId: currentCartoon.id,
        episodeNumber: currentCartoon.episodes[currentEpisodeIndex].episodeNumber,
        currentTime: currentTime,
        duration: duration,
        timestamp: Date.now()
    };
    
    saveProgress(currentCartoon.id, currentCartoon.episodes[currentEpisodeIndex].episodeNumber, currentTime);
}

// 加载播放进度
function loadPlayProgress() {
    if (!player || !currentCartoon) return;
    
    const progress = getProgress(
        currentCartoon.id,
        currentCartoon.episodes[currentEpisodeIndex].episodeNumber
    );
    
    if (progress && progress > 0) {
        // 等待视频加载完成后再设置进度
        player.ready(function() {
            const duration = player.duration();
            if (duration && progress < duration) {
                player.currentTime(progress);
                console.log('恢复播放进度:', formatTime(progress));
            }
        });
    }
}

// 格式化时间
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 渲染相关推荐
function renderRelated(cartoon) {
    const grid = document.getElementById('related-grid');
    if (!grid) return;
    
    loadCartoonsData().then(() => {
        const allCartoons = getAllCartoons();
        const sameCategory = filterByCategory(allCartoons, cartoon.category);
        const related = sameCategory
            .filter(item => item.id !== cartoon.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        if (related.length === 0) {
            grid.innerHTML = '<p style="color:#666;">暂无相关推荐</p>';
            return;
        }
        
        grid.innerHTML = related.map(item => {
            const cover = item.cover || 'https://via.placeholder.com/400x225/8B4513/FFF8DC?text=No+Image';
            return `
            <div class="related-card" data-id="${item.id}">
                <div class="related-card-cover">
                    <img src="${cover}" alt="${item.title}" 
                         onerror="console.error('图片加载失败:', '${cover}'); this.style.display='none'; this.onerror=null;">
                </div>
                <div class="related-card-body">
                    <div class="related-card-title">${item.title}</div>
                    <div class="related-card-meta">
                        <span>${item.year}</span>
                        <span class="related-card-rating">★ ${item.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                </div>
            </div>
        `;
        }).join('');
        
        // 绑定点击事件
        grid.querySelectorAll('.related-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                window.location.href = `video.html?id=${id}`;
            });
        });
    });
}

// 收藏功能
function toggleFavorite() {
    if (!currentCartoon) return;
    
    if (isCollected(currentCartoon.id)) {
        removeCollection(currentCartoon.id);
    } else {
        addCollection(currentCartoon.id);
    }
    
    updateFavoriteButton();
}

function updateFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    if (!btn || !currentCartoon) return;
    
    // 绑定点击事件（如果还没有绑定）
    if (!btn.hasAttribute('data-bound')) {
        btn.addEventListener('click', function() {
            if (isCollected(currentCartoon.id)) {
                // 取消收藏
                removeCollection(currentCartoon.id);
                console.log('已取消收藏:', currentCartoon.title);
            } else {
                // 添加收藏
                addCollection(currentCartoon.id);
                console.log('已添加收藏:', currentCartoon.title);
            }
            updateFavoriteButton();
        });
        btn.setAttribute('data-bound', 'true');
    }
    
    // 更新按钮状态
    if (isCollected(currentCartoon.id)) {
        btn.classList.add('active');
        btn.innerHTML = '<span class="icon-heart-filled">❤️</span><span>已收藏</span>';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<span class="icon-heart-empty">🤍</span><span>收藏</span>';
    }
}

// 页面卸载时保存进度
window.addEventListener('beforeunload', function() {
    if (player) {
        savePlayProgress();
    }
});

// 页面隐藏时保存进度
document.addEventListener('visibilitychange', function() {
    if (document.hidden && player) {
        savePlayProgress();
    }
});
