// Update online users count
function updateOnlineUsers() {
    fetch('/api/online-users')
        .then(response => response.json())
        .then(data => {
            const onlineCountElement = document.getElementById('onlineCount');
            if (onlineCountElement) {
                onlineCountElement.textContent = data.count;
            }
        })
        .catch(error => console.error('Error fetching online users:', error));
}

// Update every 30 seconds
setInterval(updateOnlineUsers, 30000);

// Initial update
updateOnlineUsers();
