import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Card, Button, Input, Textarea } from '../styles/theme';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({});
  const [modNotes, setModNotes] = useState([]);
  const [bio, setBio] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, notesRes] = await Promise.all([
          axios.get('/api/user', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`/api/admin/mod-notes/${user.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ data: [] })),
        ]);
        setProfile(profileRes.data);
        setBio(profileRes.data.bio || '');
        setModNotes(notesRes.data);
      } catch (err) {
        console.error('Failed to fetch profile');
      }
    };
    fetchData();
  }, [user]);

  const updateBio = async () => {
    try {
      await axios.post('/api/user/bio', { bio }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfile({ ...profile, bio });
      alert('Bio updated');
    } catch (err) {
      alert('Failed to update bio');
    }
  };

  return (
    <Card>
      <h2>Profile</h2>
      <img src={profile.pfp_url || 'default.png'} alt="Profile" style={{ width: '100px', borderRadius: '50%' }} />
      <p>Username: {profile.username}</p>
      <p>Roblox Username: {profile.roblox_username}</p>
      <p>Discord Username: {profile.discord_username}</p>
      <p>Role: {profile.role}</p>
      <Textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Update your bio"
      />
      <Button onClick={updateBio}>Update Bio</Button>
      {profile.banned && <p style={{ color: 'red' }}>Banned</p>}
      {profile.flagged && <p style={{ color: 'orange' }}>Flagged</p>}
      {[3, 4, 5].includes(user.role_id) && (
        <>
          <h3>Mod Notes</h3>
          {modNotes.map(note => (
            <Card key={note.id}>
              <p>{note.note}</p>
              <p>By {note.created_by} at {new Date(note.created_at).toLocaleString()}</p>
            </Card>
          ))}
        </>
      )}
    </Card>
  );
};

export default UserProfile;