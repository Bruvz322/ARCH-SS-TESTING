import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Card, Button, Input, Textarea } from '../styles/theme';
import styled from 'styled-components';

const Thread = styled(Card)`
  margin-bottom: 20px;
`;

const Forums = () => {
  const { user } = useContext(AuthContext);
  const [threads, setThreads] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await axios.get('/api/forums', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setThreads(res.data);
      } catch (err) {
        console.error('Failed to fetch threads');
      }
    };
    fetchThreads();
  }, []);

  const createThread = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert('Title and content required');
    try {
      await axios.post('/api/forums', { title, content }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTitle('');
      setContent('');
      const res = await axios.get('/api/forums', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setThreads(res.data);
    } catch (err) {
      alert('Failed to create thread');
    }
  };

  const moderateThread = async (threadId, action) => {
    try {
      await axios.post('/api/forums/moderate', { thread_id: threadId, action }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const res = await axios.get('/api/forums', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setThreads(res.data);
    } catch (err) {
      alert('Moderation failed');
    }
  };

  return (
    <div>
      <h2>Forums</h2>
      {user && (
        <Card>
          <h3>New Thread</h3>
          <form onSubmit={createThread}>
            <Input
              type="text"
              placeholder="Thread Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <Textarea
              placeholder="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Button type="submit">Post Thread</Button>
          </form>
        </Card>
      )}
      {threads.map(thread => (
        <Thread key={thread.id}>
          <h3>{thread.title} {thread.pinned && <span>(Pinned)</span>} {thread.locked && <span>(Locked)</span>}</h3>
          <p>{thread.content}</p>
          <p>By {thread.username} at {new Date(thread.created_at).toLocaleString()}</p>
          {[3, 4, 5].includes(user?.role_id) && (
            <div>
              <Button onClick={() => moderateThread(thread.id, 'pin')}>{thread.pinned ? 'Unpin' : 'Pin'}</Button>
              <Button onClick={() => moderateThread(thread.id, 'lock')}>{thread.locked ? 'Unlock' : 'Lock'}</Button>
              <Button onClick={() => moderateThread(thread.id, 'delete')}>Delete</Button>
            </div>
          )}
        </Thread>
      ))}
    </div>
  );
};

export default Forums;