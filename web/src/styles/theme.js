import styled from 'styled-components';

export const theme = {
  primary: '#ff3333',
  secondary: '#ffe6e6',
  background: '#fff5f5',
  text: '#333',
  accent: '#cc0000',
};

export const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: ${theme.background};
  color: ${theme.text};
`;

export const Button = styled.button`
  background: ${theme.primary};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background: ${theme.accent};
  }
`;

export const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin: 10px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const Input = styled.input`
  padding: 10px;
  margin: 5px 0;
  border-radius: 5px;
  border: 1px solid ${theme.text};
  width: 100%;
`;

export const Textarea = styled.textarea`
  padding: 10px;
  margin: 5px 0;
  border-radius: 5px;
  border: 1px solid ${theme.text};
  width: 100%;
`;

export const DiscordButton = styled.a`
  display: inline-block;
  background: ${props => props.theme.primary};
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  text-decoration: none;
  margin-bottom: 20px;
  &:hover {
    background: ${props => props.theme.accent};
  }
`;