const API_URL = 'http://localhost:8000';

export const login = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const res = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const register = async (username, password) => {
  const res = await fetch(`${API_URL}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

export const fetchClients = async (token) => {
  const res = await fetch(`${API_URL}/clients/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
};

export const createClient = async (token, clientData) => {
  const res = await fetch(`${API_URL}/clients/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(clientData)
  });
  if (!res.ok) throw new Error('Failed to create client');
  return res.json();
};

export const fetchLoans = async (token) => {
  const res = await fetch(`${API_URL}/loans/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch loans');
  return res.json();
};

export const createLoan = async (token, loanData) => {
  const res = await fetch(`${API_URL}/loans/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(loanData)
  });
  if (!res.ok) throw new Error('Failed to create loan');
  return res.json();
};

export const updateLoan = async (token, loanId, updateData) => {
  const res = await fetch(`${API_URL}/loans/${loanId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) throw new Error('Failed to update loan');
  return res.json();
};

export const fetchUserProfile = async (token) => {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
};

export const registerOfficer = async (token, username, password) => {
  const res = await fetch(`${API_URL}/users/`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ username, password, role: 'officer' })
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
};
