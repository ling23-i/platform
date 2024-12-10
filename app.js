// app.js
document.addEventListener('DOMContentLoaded', () => {
    const blockchain = loadBlockchainFromLocalStorage();

    // Handle new post form submission
    const formElement = document.getElementById('new-post-form');
    if (formElement) {
        formElement.addEventListener('submit', function(event) {
            event.preventDefault();
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;

            console.log('New Post Data:', { title, content }); // Debugging line

            const postData = { title, content, likes: 0, comments: [], author: generateRandomHash() };
            const newBlock = new Block(blockchain.chain.length, Date.now(), postData);
            blockchain.addBlock(newBlock);

            saveBlockchainToLocalStorage(blockchain);
            console.log('Blockchain after adding new block:', blockchain); // Debugging line
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

function loadBlockchainFromLocalStorage() {
    const blockchainData = localStorage.getItem('blockchain');
    let blockchain = new Blockchain();
    if (blockchainData) {
        try {
            const parsedData = JSON.parse(blockchainData);
            blockchain.chain = parsedData.chain.map((blockData, index) => {
                if (index === 0) {
                    return blockchain.createGenesisBlock(); // Ensure genesis block is correctly created
                }
                return new Block(
                    blockData.index,
                    blockData.timestamp,
                    blockData.data,
                    '' // Initialize previousHash as empty string temporarily
                );
            });

            // Re-calculate hashes to ensure integrity
            for (let i = 1; i < blockchain.chain.length; i++) {
                blockchain.chain[i].previousHash = blockchain.chain[i - 1].hash;
                blockchain.chain[i].hash = blockchain.chain[i].calculateHash();
            }
        } catch (error) {
            console.error('Error parsing blockchain data from localStorage:', error);
            blockchain = new Blockchain(); // Fallback to a new blockchain
        }
    }
    return blockchain;
}

function saveBlockchainToLocalStorage(blockchain) {
    localStorage.setItem('blockchain', JSON.stringify(blockchain));
}

function loadPosts() {
    const blockchain = loadBlockchainFromLocalStorage();
    console.log('Loaded Blockchain:', blockchain); // Debugging line
    renderPosts(blockchain.chain.slice(1).map(block => block.data));
}

function renderPosts(posts) {
    const postsContainer = document.getElementById('posts');
    postsContainer.innerHTML = '';

    console.log('Rendering Posts:', posts); // Debugging line

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post';

        postElement.innerHTML = `
            <h2>${post.title}</h2>
            <p>${post.content}</p>
            <p>Author: ${post.author}</p>
            <button onclick="likePost('${encodeURIComponent(JSON.stringify(post))}')">Like (${post.likes})</button>
            <div class="comments">
                ${post.comments.map(comment => `<div class="comment">${comment}</div>`).join('')}
                <input type="text" id="comment-input-${encodeURIComponent(JSON.stringify(post))}" placeholder="Add a comment...">
                <button onclick="addComment('${encodeURIComponent(JSON.stringify(post))}')">Comment</button>
            </div>
        `;

        postsContainer.appendChild(postElement);
    });
}

function likePost(encodedPostData) {
    const postData = JSON.parse(decodeURIComponent(encodedPostData));
    const blockchain = loadBlockchainFromLocalStorage();

    const updatedBlockchain = updatePostLikes(blockchain, postData);
    saveBlockchainToLocalStorage(updatedBlockchain);

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

    const blockchain = loadBlockchainFromLocalStorage();

    const updatedBlockchain = updatePostComments(blockchain, postData, commentText);
    saveBlockchainToLocalStorage(updatedBlockchain);

    document.getElementById(commentInputId).value = '';
    loadPosts();
}

function updatePostLikes(blockchain, postData) {
    const index = findPostIndex(blockchain, postData);
    if (index === -1) {
        console.error('Post not found in blockchain.');
        return blockchain;
    }

    blockchain.chain[index].data.likes++;
    blockchain.chain[index].hash = blockchain.chain[index].calculateHash();

    // Recalculate hashes for subsequent blocks
    for (let i = index + 1; i < blockchain.chain.length; i++) {
        blockchain.chain[i].previousHash = blockchain.chain[i - 1].hash;
        blockchain.chain[i].hash = blockchain.chain[i].calculateHash();
    }

    return blockchain;
}

function updatePostComments(blockchain, postData, comment) {
    const index = findPostIndex(blockchain, postData);
    if (index === -1) {
        console.error('Post not found in blockchain.');
        return blockchain;
    }

    blockchain.chain[index].data.comments.push(comment);
    blockchain.chain[index].hash = blockchain.chain[index].calculateHash();

    // Recalculate hashes for subsequent blocks
    for (let i = index + 1; i < blockchain.chain.length; i++) {
        blockchain.chain[i].previousHash = blockchain.chain[i - 1].hash;
        blockchain.chain[i].hash = blockchain.chain[i].calculateHash();
    }

    return blockchain;
}

function findPostIndex(blockchain, postData) {
    for (let i = 1; i < blockchain.chain.length; i++) {
        if (blockchain.chain[i].data.title === postData.title && blockchain.chain[i].data.content === postData.content) {
            return i;
        }
    }
    return -1;
}

function filterPostsByKeyword(keyword) {
    const blockchain = loadBlockchainFromLocalStorage();

    return blockchain.chain.slice(1).map(block => block.data)
        .filter(post => post.title.toLowerCase().includes(keyword) || post.content.toLowerCase().includes(keyword));
}

function generateRandomHash() {
    return CryptoJS.SHA256(Math.random().toString()).toString();
}