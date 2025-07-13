import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Card, Button, Input, Textarea } from '../styles/theme';

const Tickets = () => {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await axios.get('/api/tickets', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setTickets(res.data);
      } catch (err) {
        console.error('Failed to fetch tickets');
      }
    };
    fetchTickets();
  }, []);

  const createTicket = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert('Title and content required');
    try {
      await axios.post('/api/tickets', { title, content }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTitle('');
      setContent('');
      const res = await axios.get('/api/tickets', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTickets(res.data);
    } catch (err) {
      alert('Failed to create ticket');
    }
  };

  const updateTicket = async (ticketId, status) => {
    try {
      await axios.post(`/api/admin/tickets/${ticketId}`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const res = await axios.get('/api/tickets', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTickets(res.data);
    } catch (err) {
      alert('Failed to update ticket');
    }
  };

  return (
    <div>
      <h2>Support Tickets</h2>
      {user && (
        <Card>
          <h3>New Ticket</h3>
          <form onSubmit={createTicket}>
            <Input
              type="text"
              placeholder="Ticket Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <Textarea
              placeholder="Describe your issue"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Button type="submit">Submit Ticket</Button>
          </form>
        </Card>
      )}
      {tickets.map(ticket => (
        <Card key={ticket.id}>
          <h3>{ticket.title}</h3>
          <p>{ticket.content}</p>
          <p>Status: {ticket.status}</p>
          <p>By {ticket.username} at {new Date(ticket.created_at).toLocaleString()}</p>
          {[4, 5].includes(user?.role_id) && (
            <div>
              <Button onClick={() => updateTicket(ticket.id, 'open')}>Open</Button>
              <Button onClick={() => updateTicket(ticket.id, 'in_progress')}>In Progress</Button>
              <Button onClick={() => updateTicket(ticket.id, 'closed')}>Close</Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default Tickets;