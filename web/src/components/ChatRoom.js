import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Card, Button, Input } from '../styles/theme';
import styled from 'styled-components';

const ChatContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 300px;
  max-height: 400px;
  overflow-y: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 10px;
`;

const Message = styled.div`
  margin: 5px 0;
  padding: 5px;
  background: ${props => props.theme.secondary};
  border-radius: 5px;
`;

const ChatRoom = () => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get('/api/chat', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setMessages(res.data.reverse());
      } catch (err) {
        console.error('Failed to fetch messages');
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await axios.post('/api/chat', { message: newMessage }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNewMessage('');
      const res = await axios.get('/api/chat', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMessages(res.data.reverse());
    } catch (err) {
      alert('Failed to send message');
    }
  };

  return (
    <ChatContainer>
      <h3>ARCH SS Chat</h3>
      {messages.map(msg => (
        <Message key={msg.id}>
          <strong>{msg.username}</strong>: {msg.message}
          <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
        </Message>
      ))}
      {user && (
        <form onSubmit={sendMessage}>
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
          />
          <Button type="submit">Send</Button>
        </form>
      )}
    </ChatContainer>
  );
};

export default ChatRoom;