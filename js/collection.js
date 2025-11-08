// 收藏功能
// 注意：COLLECTION_KEY 已在 data.js 中定义，这里不再重复声明
const OLD_COLLECTION_KEY = 'cartoon_collection'; // 旧键名（兼容性）

// 获取收藏列表（兼容新旧键名）
function getCollection() {
    // 优先使用新键名
    let collection = localStorage.getItem(COLLECTION_KEY);
    if (collection) {
        try {
            return JSON.parse(collection);
        } catch (e) {
            console.error('读取收藏列表失败:', e);
        }
    }
    
    // 兼容旧键名
    collection = localStorage.getItem(OLD_COLLECTION_KEY);
    if (collection) {
        try {
            const oldData = JSON.parse(collection);
            // 迁移到新键名
            localStorage.setItem(COLLECTION_KEY, collection);
            return oldData;
        } catch (e) {
            console.error('读取旧收藏列表失败:', e);
        }
    }
    
    return [];
}

// 添加收藏
function addToCollection(cartoonId) {
    const collection = getCollection();
    if (!collection.includes(cartoonId)) {
        collection.push(cartoonId);
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
        return true;
    }
    return false;
}

// 移除收藏
function removeFromCollection(cartoonId) {
    const collection = getCollection();
    const index = collection.indexOf(cartoonId);
    if (index > -1) {
        collection.splice(index, 1);
        localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
        // 同时更新旧键名（兼容性）
        localStorage.setItem(OLD_COLLECTION_KEY, JSON.stringify(collection));
        return true;
    }
    return false;
}

// 检查是否已收藏
function isInCollection(cartoonId) {
    const collection = getCollection();
    return collection.includes(cartoonId);
}

// 获取收藏的动画片详情
function getCollectionCartoons() {
    const collection = getCollection();
    // 需要从data.js获取完整数据
    if (typeof getAllCartoons === 'function') {
        const allCartoons = getAllCartoons();
        return allCartoons.filter(cartoon => collection.includes(cartoon.id));
    }
    return [];
}

// 清空收藏
function clearCollection() {
    localStorage.removeItem(COLLECTION_KEY);
    localStorage.removeItem(OLD_COLLECTION_KEY);
}

