document.addEventListener('DOMContentLoaded', () => {
    const repoOwner = 'ling23-i'; // Replace with your GitHub username
    const repoName = 'platform';       // Replace with your repository name
    const accessToken = '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'; // You need to generate a personal access token with read/write access to issues.

    let blockchains = loadBlockchainsFromLocalStorage();

    // Handle new post form submission
    const formElement = document.getElementById('new-post-form');
    if (formElement) {
        formElement.addEventListener('submit', function(event) {
            event.preventDefault();
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;

            console.log('New Post Data:', { title, content }); // Debugging line

            createGitHubIssue(repoOwner, repoName, accessToken, title, content);
        });
    } else {
        console.error('Form element with id "new-post-form" not found.');
    }

    // Load posts on community page
    if (window.location.pathname.includes('community.html')) {
        loadPostsFromGitHub(repoOwner, repoName, accessToken);
    }

    // Handle search form submission
    const searchFormElement = document.getElementById('search-form');
    if (searchFormElement) {
        searchFormElement.addEventListener('submit', function(event) {
            event.preventDefault();
            const keyword = document.getElementById('search-keyword').value.toLowerCase();
            filterPostsByKeyword(repoOwner, repoName, accessToken, keyword);
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

async function loadPostsFromGitHub(repoOwner, repoName, accessToken) {
    try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues?state=all`, {
            headers: {
                Authorization: `token ${accessToken}`
            }
        });
        const issues = await response.json();

        const allPosts = [];
        for (const issue of issues) {
            const postData = { 
                title: issue.title, 
                content: issue.body.split('\n\n**Likes:** ')[0], 
                likes: issue.body.match(/\*\*Likes:\*\* (\d+)/)?.[1] ? parseInt(issue.body.match(/\*\*Likes:\*\* (\d+)/)[1]) : 0, 
                comments: [], 
                author: generateRandomHash(), 
                issueNumber: issue.number 
            };

            // Fetch comments for each issue
            const commentsResponse = await fetch(issue.comments_url, {
                headers: {
                    Authorization: `token ${accessToken}`
                }
            });
            const comments = await commentsResponse.json();
            postData.comments = comments.map(comment => comment.body);

            const blockchainKey = generateRandomHash();
            const newBlockchain = new Blockchain();
            const newBlock = new Block(newBlockchain.chain.length, Date.now(), postData);
            newBlockchain.addBlock(newBlock);

            blockchains[blockchainKey] = newBlockchain;
            saveBlockchainsToLocalStorage(blockchains);

            allPosts.push(postData);
        }

        renderPosts(allPosts);
    } catch (error) {
        console.error('Error loading posts from GitHub:', error);
    }
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
            <button onclick="likePost('${encodeURIComponent(JSON.stringify(post))}', '${encodeURIComponent(JSON.stringify({ repoOwner, repoName, accessToken }))}')">Like (${post.likes})</button>
            <div class="comments">
                ${post.comments.map(comment => `<div class="comment">${escapeHtml(comment)}</div>`).join('')}
                <input type="text" id="comment-input-${encodeURIComponent(JSON.stringify(post))}" placeholder="Add a comment...">
                <button onclick="addComment('${encodeURIComponent(JSON.stringify(post))}', '${encodeURIComponent(JSON.stringify({ repoOwner, repoName, accessToken }))}')">Comment</button>
            </div>
        `;

        postsContainer.appendChild(postElement);
    });
}

async function likePost(encodedPostData, encodedAuthData) {
    const postData = JSON.parse(decodeURIComponent(encodedPostData));
    const authData = JSON.parse(decodeURIComponent(encodedAuthData));
    const { repoOwner, repoName, accessToken } = authData;

    const blockchains = loadBlockchainsFromLocalStorage();

    if (!blockchains[postData.blockchainKey]) {
        console.error('Blockchain not found for the given post.');
        return;
    }

    const updatedBlockchain = updatePostLikes(blockchains, postData.blockchainKey, postData);
    saveBlockchainsToLocalStorage(updatedBlockchain);

    // Update GitHub Issue with like count
    try {
        await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${postData.issueNumber}`, {
            method: 'PATCH',
            headers: {
                Authorization: `token ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: `${postData.content}\n\n**Likes:** ${updatedBlockchain[postData.blockchainKey].chain[1].data.likes}`
            })
        });
    } catch (error) {
        console.error('Error updating GitHub Issue with like count:', error);
    }

    loadPostsFromGitHub(repoOwner, repoName, accessToken);
}

async function addComment(encodedPostData, encodedAuthData) {
    const postData = JSON.parse(decodeURIComponent(encodedPostData));
    const authData = JSON.parse(decodeURIComponent(encodedAuthData));
    const { repoOwner, repoName, accessToken } = authData;

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
    
    // Add comment to GitHub Issue
    try {
        await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${postData.issueNumber}/comments`, {
            method: 'POST',
            headers: {
                Authorization: `token ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: commentText })
        });
    } catch (error) {
        console.error('Error adding comment to GitHub Issue:', error);
    }

    loadPostsFromGitHub(repoOwner, repoName, accessToken);
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

async function filterPostsByKeyword(repoOwner, repoName, accessToken, keyword) {
    try {
        const response = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(keyword)}+repo:${repoOwner}/${repoName}&type=issue`, {
            headers: {
                Authorization: `token ${accessToken}`
            }
        });
        const result = await response.json();
        const issues = result.items;

        const allPosts = [];
        for (const issue of issues) {
            const postData = { 
                title: issue.title, 
                content: issue.body.split('\n\n**Likes:** ')[0], 
                likes: issue.body.match(/\*\*Likes:\*\* (\d+)/)?.[1] ? parseInt(issue.body.match(/\*\*Likes:\*\* (\d+)/)[1]) : 0, 
                comments: [], 
                author: generateRandomHash(), 
                issueNumber: issue.number 
            };

            // Fetch comments for each issue
            const commentsResponse = await fetch(issue.comments_url, {
                headers: {
                    Authorization: `token ${accessToken}`
                }
            });
            const comments = await commentsResponse.json();
            postData.comments = comments.map(comment => comment.body);

            allPosts.push(postData);
        }

        renderPosts(allPosts);
    } catch (error) {
        console.error('Error filtering posts by keyword:', error);
    }
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

async function createGitHubIssue(repoOwner, repoName, accessToken, title, content) {
    try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
            method: 'POST',
            headers: {
                Authorization: `token ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, body: content })
        });
        const issue = await response.json();

        const postData = { 
            title: issue.title, 
            content: issue.body, 
            likes: 0, 
            comments: [], 
            author: generateRandomHash(), 
            issueNumber: issue.number 
        };
        const blockchainKey = generateRandomHash();
        const newBlockchain = new Blockchain();
        const newBlock = new Block(newBlockchain.chain.length, Date.now(), postData);
        newBlockchain.addBlock(newBlock);

        blockchains[blockchainKey] = newBlockchain;
        saveBlockchainsToLocalStorage(blockchains);

        alert('Post submitted successfully!');
        window.location.href = 'community.html';
    } catch (error) {
        console.error('Error creating GitHub Issue:', error);
    }
}
