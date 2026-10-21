import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Database Connection
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatterup';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Track online users
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins with username and profile picture
  socket.on('join', async ({ username, profilePic }) => {
    connectedUsers[socket.id] = { username, profilePic };

    // Broadcast updated active user list and join notification
    io.emit('update-users', connectedUsers);
    io.emit('notification', { message: `${username} joined the chat.`, online: true });

    // Send existing chat history to the newly joined user
    try {
      const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
      socket.emit('chat-history', messages);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  });

  // Handle incoming chat messages
  socket.on('chat-message', async (data) => {
    const { message, username, profilePic } = data;
    const newMessage = new Message({
      username,
      profilePic,
      message,
      timestamp: new Date()
    });

    try {
      await newMessage.save();
      // Broadcast message to all connected clients
      io.emit('chat-message', newMessage);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Handle typing indicators
  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username);
  });

  socket.on('stop-typing', () => {
    socket.broadcast.emit('stop-typing');
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const user = connectedUsers[socket.id];
    if (user) {
      io.emit('notification', { message: `${user.username} left the chat.`, online: false });
      delete connectedUsers[socket.id];
      io.emit('update-users', connectedUsers);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
