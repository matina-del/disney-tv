// 评论功能
let currentCartoonId = null;

// 初始化评论功能
function initComments(cartoonId) {
    currentCartoonId = cartoonId;
    
    // 加载评论列表
    loadComments();
    
    // 绑定事件
    bindCommentEvents();
}

// 绑定评论事件
function bindCommentEvents() {
    const commentInput = document.getElementById('comment-input');
    const commentSubmitBtn = document.getElementById('comment-submit-btn');
    const commentLength = document.getElementById('comment-length');
    
    if (!commentInput || !commentSubmitBtn) return;
    
    // 输入框内容变化
    commentInput.addEventListener('input', function() {
        const length = this.value.length;
        if (commentLength) {
            commentLength.textContent = length;
            // 超过限制时变红
            if (length > 450) {
                commentLength.style.color = '#ff4444';
            } else {
                commentLength.style.color = '#666';
            }
        }
        
        // 禁用/启用提交按钮
        if (commentSubmitBtn) {
            commentSubmitBtn.disabled = length === 0 || length > 500;
        }
    });
    
    // 提交评论
    commentSubmitBtn.addEventListener('click', submitComment);
    
    // 回车提交（Shift+Enter换行）
    commentInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitComment();
        }
    });
}

// 提交评论
function submitComment() {
    const commentInput = document.getElementById('comment-input');
    if (!commentInput || !currentCartoonId) return;
    
    const content = commentInput.value.trim();
    if (!content || content.length === 0) {
        alert('请输入评论内容');
        return;
    }
    
    if (content.length > 500) {
        alert('评论内容不能超过500字');
        return;
    }
    
    // 获取用户名（可以从登录系统获取，这里简单实现）
    const username = getCurrentUsername();
    
    // 添加评论
    const comment = addComment(currentCartoonId, content, username);
    
    if (comment) {
        // 清空输入框
        commentInput.value = '';
        if (document.getElementById('comment-length')) {
            document.getElementById('comment-length').textContent = '0';
        }
        
        // 重新加载评论列表
        loadComments();
        
        // 显示成功提示
        showCommentToast('评论发表成功！');
    } else {
        alert('评论发表失败，请重试');
    }
}

// 获取当前用户名
function getCurrentUsername() {
    // 从LocalStorage获取用户名，如果没有则使用默认值
    let username = localStorage.getItem('comment_username');
    if (!username) {
        // 生成随机用户名
        const adjectives = ['快乐', '聪明', '勇敢', '善良', '可爱', '阳光', '温暖', '美好'];
        const nouns = ['小鹿', '兔子', '猫咪', '小鸟', '星星', '月亮', '花朵', '彩虹'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        username = adj + noun + Math.floor(Math.random() * 1000);
        localStorage.setItem('comment_username', username);
    }
    return username;
}

// 加载评论列表
function loadComments() {
    if (!currentCartoonId) return;
    
    const commentsList = document.getElementById('comments-list');
    const commentsEmpty = document.getElementById('comments-empty');
    const commentCount = document.getElementById('comment-count');
    
    if (!commentsList) return;
    
    const comments = getComments(currentCartoonId);
    
    // 更新评论数量
    if (commentCount) {
        commentCount.textContent = `(${comments.length})`;
    }
    
    // 显示/隐藏空状态
    if (commentsEmpty) {
        commentsEmpty.style.display = comments.length === 0 ? 'block' : 'none';
    }
    
    // 渲染评论列表
    if (comments.length === 0) {
        commentsList.innerHTML = '';
        if (commentsEmpty) {
            commentsList.appendChild(commentsEmpty);
        }
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => renderComment(comment)).join('');
    
    // 绑定点赞事件
    bindLikeEvents();
}

// 渲染单条评论
function renderComment(comment) {
    const isLiked = isCommentLiked(currentCartoonId, comment.id);
    const timeStr = formatCommentTime(comment.timestamp);
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-avatar">
                ${getAvatarText(comment.username)}
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-username">${escapeHtml(comment.username)}</span>
                    <span class="comment-time">${timeStr}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.content)}</div>
                <div class="comment-actions">
                    <button class="comment-like-btn ${isLiked ? 'liked' : ''}" 
                            data-comment-id="${comment.id}" 
                            title="${isLiked ? '取消点赞' : '点赞'}">
                        <span class="icon-like">${isLiked ? '❤️' : '🤍'}</span>
                        <span class="like-count">${comment.likes || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 获取头像文字（取用户名第一个字符）
function getAvatarText(username) {
    if (!username) return '?';
    // 如果是中文，取第一个字符；如果是英文，取首字母大写
    const firstChar = username.charAt(0);
    if (/[\u4e00-\u9fa5]/.test(firstChar)) {
        return firstChar;
    }
    return firstChar.toUpperCase();
}

// 格式化评论时间
function formatCommentTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    // 小于1分钟
    if (diff < 60 * 1000) {
        return '刚刚';
    }
    
    // 小于1小时
    if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}分钟前`;
    }
    
    // 小于1天
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours}小时前`;
    }
    
    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}天前`;
    }
    
    // 超过7天，显示具体日期
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 如果是今年，不显示年份
    if (year === new Date().getFullYear()) {
        return `${month}-${day}`;
    }
    
    return `${year}-${month}-${day}`;
}

// 绑定点赞事件
function bindLikeEvents() {
    const likeButtons = document.querySelectorAll('.comment-like-btn');
    likeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            if (!commentId || !currentCartoonId) return;
            
            toggleCommentLike(currentCartoonId, commentId);
            loadComments(); // 重新加载评论列表以更新点赞状态
        });
    });
}

// HTML转义（防止XSS）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示评论提示
function showCommentToast(message) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'comment-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 3秒后移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}


