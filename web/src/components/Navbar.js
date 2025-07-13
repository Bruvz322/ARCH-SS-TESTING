import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Button } from '../styles/theme';
import styled from 'styled-components';
import logo from '../assets/red_crown.svg';

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => props.theme.primary};
  padding: 10px 20px;
  border-radius: 5px;
`;

const Logo = styled.img`
  height: 40px;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 20px;
`;

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <Nav>
      <Link to="/">
        <Logo src={logo} alt="ARCH SS Logo" />
      </Link>
      <NavLinks>
        {user && (
          <>
            <Link to="/">Games</Link>
            <Link to="/chat">Chat</Link>
            <Link to="/forums">Forums</Link>
            <Link to="/announcements">Announcements</Link>
            <Link to="/tickets">Tickets</Link>
            {[3, 4, 5].includes(user.role_id) && <Link to="/script-hub">Script Hub</Link>}
            {[4, 5].includes(user.role_id) && <Link to="/admin">Admin Panel</Link>}
            <Link to="/profile">Profile</Link>
            <Button onClick={() => { logout(); navigate('/login'); }}>Logout</Button>
          </>
        )}
        {!user && <Link to="/login">Login</Link>}
      </NavLinks>
    </Nav>
  );
};

export default Navbar;