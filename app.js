document.addEventListener('DOMContentLoaded', () => {
    let blockchains = loadBlockchainsFromLocalStorage();

    // Handle new post form submission
    const formElement = document.getElementById('new-post-form');
    if (formElement) {
        formElement.addEventListener('submit', function(event) {
            event.preventDefault();
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;

            console.log('New Post Data:', { title, content }); // Debugging line

            const postData = { title, content, likes: 0, comments: [], author: generateRandomHash() };
            const newBlockchain = new Blockchain();
            const newBlock = new Block(newBlockchain.chain.length, Date.now(), postData);
            newBlockchain.addBlock(newBlock);

            blockchains[generateRandomHash()] = newBlockchain;
            saveBlockchainsToLocalStorage(blockchains);

            console.log('Blockchains after adding new post:', blockchains); // Debugging line
            alert('Post submitted successfully!');
            window.location.href = 'community.html';
        });
    } else {
        console.error('Form element with id "new-post-form" not found.');
    }

    // Load posts on community page
    if (window.location.pathname.includes('community.html')) {
        loadPosts();
    }

    // Handle search form submission
    const searchFormElement = document.getElementById('search-form');
    if (searchFormElement) {
        searchFormElement.addEventListener('submit', function(event) {
            event.preventDefault();
            const keyword = document.getElementById('search-keyword').value.toLowerCase();
            const filteredPosts = filterPostsByKeyword(keyword);
            renderPosts(filteredPosts);
        });
    } else {
        console.error('Search form element with id "search-form" not found.');
    }
});

function loadBlockchainsFromLocalStorage() {
    const blockchainsData = localStorage.getItem('blockchains');
    let blockchains = {};
    if (blockchainsData) {
        try {
            const parsedData = JSON.parse(blockchainsData);
            for (const key in parsedData) {
                blockchains[key] = new Blockchain();
                blockchains[key].chain = parsedData[key].chain.map((blockData, index) => {
                    if (index === 0) {
                        return blockchains[key].createGenesisBlock(); // Ensure genesis block is correctly created
                    }
                    return new Block(
                        blockData.index,
                        blockData.timestamp,
                        blockData.data,
                        '' // Initialize previousHash as empty string temporarily
                    );
                });

                // Re-calculate hashes to ensure integrity
                for (let i = 1; i < blockchains[key].chain.length; i++) {
                    blockchains[key].chain[i].previousHash = blockchains[key].chain[i - 1].hash;
                    blockchains[key].chain[i].hash = blockchains[key].chain[i].calculateHash();
                }
            }
        } catch (error) {
            console.error('Error parsing blockchains data from localStorage:', error);
            blockchains = {}; // Fallback to an empty object
        }
    }
    return blockchains;
}

function saveBlockchainsToLocalStorage(blockchains) {
    localStorage.setItem('blockchains', JSON.stringify(blockchains));
}

function loadPosts() {
    const blockchains = loadBlockchainsFromLocalStorage();
    console.log('Loaded Blockchains:', blockchains); // Debugging line

    const allPosts = [];
    for (const key in blockchains) {
        allPosts.push(blockchains[key].chain.slice(1).map(block => ({ ...block.data, blockchainKey: key })));
    }

    renderPosts(allPosts.flat());
}

function renderPosts(posts) {
    const postsContainer = document.getElementById('posts');
    postsContainer.innerHTML = '';

    console.log('Rendering Posts:', posts); // Debugging line

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post';

        postElement.innerHTML = `
            <h2>${escapeHtml(post.title)}</h2>
            <p>${escapeHtml(post.content)}</p>
            <p>Author: ${escapeHtml(post.author)}</p>
            <button onclick="likePost('${encodeURIComponent(JSON.stringify(post))}')">Like (${post.likes})</button>
            <div class="comments">
                ${post.comments.map(comment => `<div class="comment">${escapeHtml(comment)}</div>`).join('')}
                <input type="text" id="comment-input-${encodeURIComponent(JSON.stringify(post))}" placeholder="Add a comment...">
                <button onclick="addComment('${encodeURIComponent(JSON.stringify(post))}')">Comment</button>
            </div>
        `;

        postsContainer.appendChild(postElement);
    });
}

function likePost(encodedPostData) {
    const postData = JSON.parse(decodeURIComponent(encodedPostData));
    const blockchains = loadBlockchainsFromLocalStorage();

    if (!blockchains[postData.blockchainKey]) {
        console.error('Blockchain not found for the given post.');
        return;
    }

    const updatedBlockchain = updatePostLikes(blockchains, postData.blockchainKey, postData);
    saveBlockchainsToLocalStorage(updatedBlockchain);

    loadPosts();
}

function addComment(encodedPostData) {
    const postData = JSON.parse(decodeURIComponent(encodedPostData));
    const commentInputId = `comment-input-${encodeURIComponent(JSON.stringify(postData))}`;
    const commentText = document.getElementById(commentInputId).value;

    if (!commentText.trim()) {
        alert('Please enter a comment.');
        return;
    }

    const blockchains = loadBlockchainsFromLocalStorage();

    if (!blockchains[postData.blockchainKey]) {
        console.error('Blockchain not found for the given post.');
        return;
    }

    const updatedBlockchain = updatePostComments(blockchains, postData.blockchainKey, postData, commentText);
    saveBlockchainsToLocalStorage(updatedBlockchain);

    document.getElementById(commentInputId).value = '';
    loadPosts();
}

function updatePostLikes(blockchains, blockchainKey, postData) {
    const blockchain = blockchains[blockchainKey];
    const index = findPostIndex(blockchain, postData);
    if (index === -1) {
        console.error('Post not found in blockchain.');
        return blockchains;
    }

    blockchain.chain[index].data.likes++;
    blockchain.chain[index].hash = blockchain.chain[index].calculateHash();

    // Recalculate hashes for subsequent blocks
    recalculateHashes(blockchain, index);

    return blockchains;
}

function updatePostComments(blockchains, blockchainKey, postData, comment) {
    const blockchain = blockchains[blockchainKey];
    const index = findPostIndex(blockchain, postData);
    if (index === -1) {
        console.error('Post not found in blockchain.');
        return blockchains;
    }

    blockchain.chain[index].data.comments.push(comment);
    blockchain.chain[index].hash = blockchain.chain[index].calculateHash();

    // Recalculate hashes for subsequent blocks
    recalculateHashes(blockchain, index);

    return blockchains;
}

function findPostIndex(blockchain, postData) {
    for (let i = 1; i < blockchain.chain.length; i++) {
        if (blockchain.chain[i].data.title === postData.title && blockchain.chain[i].data.content === postData.content) {
            return i;
        }
    }
    return -1;
}

function recalculateHashes(blockchain, startIndex) {
    for (let i = startIndex + 1; i < blockchain.chain.length; i++) {
        blockchain.chain[i].previousHash = blockchain.chain[i - 1].hash;
        blockchain.chain[i].hash = blockchain.chain[i].calculateHash();
    }
}

function filterPostsByKeyword(keyword) {
    const blockchains = loadBlockchainsFromLocalStorage();

    const allPosts = [];
    for (const key in blockchains) {
        allPosts.push(blockchains[key].chain.slice(1).map(block => ({ ...block.data, blockchainKey: key })));
    }

    return allPosts.flat().filter(post => 
        escapeHtml(post.title.toLowerCase()).includes(keyword) || 
        escapeHtml(post.content.toLowerCase()).includes(keyword)
    );
}

function generateRandomHash() {
    return CryptoJS.SHA256(Math.random().toString()).toString();
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}



