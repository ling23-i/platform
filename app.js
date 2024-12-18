const GITHUB_API_URL = 'https://api.github.com/repos/ling23-i/platform/issues';
const GITHUB_TOKEN = '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'; // 注意：不要在生产环境中这样做

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();

    // Handle new post form submission
    const formElement = document.getElementById('new-post-form');
    if (formElement) {
        formElement.addEventListener('submit', function(event) {
            event.preventDefault();
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;

            console.log('New Post Data:', { title, content }); // Debugging line

            const postData = { title, content, likes: 0, comments: [], author: generateRandomHash() };
            createIssue(postData)
                .then(() => {
                    alert('Post submitted successfully!');
                    window.location.href = 'community.html';
                })
                .catch(error => {
                    console.error('Error creating issue:', error);
                    alert('Failed to submit post.');
                });
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
            filterPostsByKeyword(keyword);
        });
    } else {
        console.error('Search form element with id "search-form" not found.');
    }
});

async function createIssue(data) {
    const response = await fetch(GITHUB_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: data.title,
            body: JSON.stringify({ content: data.content, likes: data.likes, comments: data.comments, author: data.author })
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

async function loadPosts() {
    const response = await fetch(GITHUB_API_URL, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const issues = await response.json();
    const posts = issues.map(issue => ({
        title: issue.title,
        ...JSON.parse(issue.body)
    }));

    renderPosts(posts);
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

async function likePost(encodedPostData) {
    const postData = JSON.parse(decodeURIComponent(encodedPostData));
    const issueNumber = findIssueNumberByTitle(postData.title);

    if (!issueNumber) {
        console.error('Issue not found.');
        return;
    }

    const updatedPostData = { ...postData, likes: postData.likes + 1 };

    await updateIssue(issueNumber, updatedPostData);
    loadPosts();
}

async function addComment(encodedPostData) {
    const postData = JSON.parse(decodeURIComponent(encodedPostData));
    const commentInputId = `comment-input-${encodeURIComponent(JSON.stringify(postData))}`;
    const commentText = document.getElementById(commentInputId).value;

    if (!commentText.trim()) {
        alert('Please enter a comment.');
        return;
    }

    const issueNumber = findIssueNumberByTitle(postData.title);

    if (!issueNumber) {
        console.error('Issue not found.');
        return;
    }

    const updatedPostData = { ...postData, comments: [...postData.comments, commentText] };

    await updateIssue(issueNumber, updatedPostData);
    document.getElementById(commentInputId).value = '';
    loadPosts();
}

async function updateIssue(issueNumber, postData) {
    const response = await fetch(`${GITHUB_API_URL}/${issueNumber}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            body: JSON.stringify(postData)
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

function findIssueNumberByTitle(title) {
    // This function should ideally fetch all issues and map titles to their numbers.
    // For simplicity, we'll assume the title is unique and directly match an issue.
    // In practice, you might need to store this mapping in your database or another way.
    // Here's a simple example assuming you have access to all issues:
    return loadPosts().then(issues => {
        const issue = issues.find(i => i.title === title);
        return issue ? issue.number : null;
    });
}

function filterPostsByKeyword(keyword) {
    loadPosts().then(posts => {
        const filteredPosts = posts.filter(post =>
            post.title.toLowerCase().includes(keyword) || post.content.toLowerCase().includes(keyword)
        );
        renderPosts(filteredPosts);
    });
}

function generateRandomHash() {
    return CryptoJS.SHA256(Math.random().toString()).toString();
}



