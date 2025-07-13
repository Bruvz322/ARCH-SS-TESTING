import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Card, Button, Textarea } from '../styles/theme';

const Announcements = () => {
  const { user } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('/api/announcements', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setAnnouncements(res.data);
      } catch (err) {
        console.error('Failed to fetch announcements');
      }
    };
    fetchAnnouncements();
  }, []);

  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!content.trim()) return alert('Content required');
    try {
      await axios.post('/api/announcements', { content }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setContent('');
      const res = await axios.get('/api/announcements', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAnnouncements(res.data);
    } catch (err) {
      alert('Failed to post announcement');
    }
  };

  return (
    <div>
      <h2>Announcements</h2>
      {[4, 5].includes(user?.role_id) && (
        <Card>
          <h3>New Announcement</h3>
          <form onSubmit={postAnnouncement}>
            <Textarea
              placeholder="Announcement Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Button type="submit">Post Announcement</Button>
          </form>
        </Card>
      )}
      {announcements.map(ann => (
        <Card key={ann.id}>
          <p>{ann.content}</p>
          <p>By {ann.username} at {new Date(ann.created_at).toLocaleString()}</p>
        </Card>
      ))}
    </div>
  );
};

export default Announcements;