const GITHUB_API_URL = 'https://api.github.com/repos/ling23-i/platform/issues';
const GITHUB_TOKEN = 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; // 替换为您的 GitHub Token
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
    try {
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
            const errorText = await response.text();
            console.error('Error creating issue:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return response.json(); // Ensure this return is valid
    } catch (error) {
        console.error('Error in createIssue:', error);
        throw error; // Re-throw the error for further handling
    }
}

async function loadPosts() {
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error loading posts:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const issues = await response.json();
        const posts = issues.map(issue => ({
            number: issue.number,
            title: issue.title,
            ...JSON.parse(issue.body)
        }));

        renderPosts(posts);
    } catch (error) {
        console.error('Error in loadPosts:', error);
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
            <h2>${post.title}</h2>
            <p>${post.content}</p>
            <p>Author: ${post.author}</p>
            <button onclick="likePost(${post.number})">Like (${post.likes})</button>
            <div class="comments">
                ${post.comments.map(comment => `<div class="comment">${comment}</div>`).join('')}
                <input type="text" id="comment-input-${post.number}" placeholder="Add a comment...">
                <button onclick="addComment(${post.number})">Comment</button>
            </div>
        `;

        postsContainer.appendChild(postElement);
    });
}

async function likePost(issueNumber) {
    try {
        const currentPostsResponse = await fetch(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (!currentPostsResponse.ok) {
            const errorText = await currentPostsResponse.text();
            console.error('Error loading posts:', currentPostsResponse.status, errorText);
            throw new Error(`HTTP error! status: ${currentPostsResponse.status}, message: ${errorText}`);
        }

        const issues = await currentPostsResponse.json();
        const post = issues.find(issue => issue.number === issueNumber);

        if (!post) {
            console.error('Post not found.');
            return;
        }

        const postData = JSON.parse(post.body);
        const updatedPostData = { ...postData, likes: postData.likes + 1 };

        const updateResponse = await fetch(`${GITHUB_API_URL}/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: JSON.stringify(updatedPostData)
            })
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Error updating issue:', updateResponse.status, errorText);
            throw new Error(`HTTP error! status: ${updateResponse.status}, message: ${errorText}`);
        }

        loadPosts();
    } catch (error) {
        console.error('Error liking post:', error);
        alert('Failed to like post.');
    }
}

async function addComment(issueNumber) {
    try {
        const commentInputId = `comment-input-${issueNumber}`;
        const commentText = document.getElementById(commentInputId).value;

        if (!commentText.trim()) {
            alert('Please enter a comment.');
            return;
        }

        const currentPostsResponse = await fetch(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (!currentPostsResponse.ok) {
            const errorText = await currentPostsResponse.text();
            console.error('Error loading posts:', currentPostsResponse.status, errorText);
            throw new Error(`HTTP error! status: ${currentPostsResponse.status}, message: ${errorText}`);
        }

        const issues = await currentPostsResponse.json();
        const post = issues.find(issue => issue.number === issueNumber);

        if (!post) {
            console.error('Post not found.');
            return;
        }

        const postData = JSON.parse(post.body);
        const updatedPostData = { ...postData, comments: [...postData.comments, commentText] };

        const updateResponse = await fetch(`${GITHUB_API_URL}/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: JSON.stringify(updatedPostData)
            })
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Error updating issue:', updateResponse.status, errorText);
            throw new Error(`HTTP error! status: ${updateResponse.status}, message: ${errorText}`);
        }

        document.getElementById(commentInputId).value = '';
        loadPosts();
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment.');
    }
}

function generateRandomHash() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}








    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


