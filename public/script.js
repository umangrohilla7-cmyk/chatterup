const socket = io();

const onboardingModal = document.getElementById('onboarding-modal');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesDiv = document.getElementById('messages');
const usersList = document.getElementById('users-list');
const userCountSpan = document.getElementById('user-count');
const typingIndicator = document.getElementById('typing-indicator');
const notificationsPanel = document.getElementById('notifications-panel');
const avatarOptions = document.querySelectorAll('.avatar-option');

let selectedAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=1';
let username = '';

avatarOptions.forEach(img => {
  img.addEventListener('click', () => {
    avatarOptions.forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');
    selectedAvatar = img.src;
  });
});

joinBtn.addEventListener('click', () => {
  username = usernameInput.value.trim();
  if (!username) {
    alert('Please enter your name');
    return;
  }
  onboardingModal.classList.add('hidden');
  chatContainer.classList.remove('hidden');

  socket.emit('join', { username, profilePic: selectedAvatar });
});

// Send Message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  socket.emit('chat-message', {
    message,
    username,
    profilePic: selectedAvatar
  });
  messageInput.value = '';
  socket.emit('stop-typing');
}

// Typing indicators
let typingTimer;
messageInput.addEventListener('input', () => {
  socket.emit('typing', username);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('stop-typing');
  }, 1000);
});

socket.on('typing', (user) => {
  typingIndicator.textContent = `${user} is typing...`;
});

socket.on('stop-typing', () => {
  typingIndicator.textContent = '';
});

// Receive Chat History
socket.on('chat-history', (history) => {
  messagesDiv.innerHTML = '';
  history.forEach(renderMessage);
});

// Receive New Messages
socket.on('chat-message', (data) => {
  renderMessage(data);
});

function renderMessage(data) {
  const messageEl = document.createElement('div');
  messageEl.classList.add('message-item');
  const timeStr = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageEl.innerHTML = `
    <img src="${data.profilePic}" alt="avatar" class="msg-avatar">
    <div class="msg-content">
      <div>
        <span class="msg-username">${data.username}</span>
        <span class="msg-time">${timeStr}</span>
      </div>
      <p>${data.message}</p>
    </div>
  `;
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// User list & counter updates
socket.on('update-users', (users) => {
  usersList.innerHTML = '';
  const userIds = Object.keys(users);
  userCountSpan.textContent = userIds.length;

  userIds.forEach(id => {
    const user = users[id];
    const li = document.createElement('li');
    li.innerHTML = `<span class="online-dot"></span> <img src="${user.profilePic}" width="24" height="24"> ${user.username}`;
    usersList.appendChild(li);
  });
});

// Notifications (joins/leaves)
socket.on('notification', (data) => {
  const notif = document.createElement('div');
  notif.classList.add('notification-item');
  notif.textContent = data.message;
  notificationsPanel.appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
});
