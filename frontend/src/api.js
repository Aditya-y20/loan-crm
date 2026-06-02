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

export const fetchLeads = async (token) => {
  const res = await fetch(`${API_URL}/leads/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
};

export const fetchLead = async (token, leadId) => {
  const res = await fetch(`${API_URL}/leads/${leadId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch lead profile');
  return res.json();
};

export const createLead = async (token, leadData) => {
  const res = await fetch(`${API_URL}/leads/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(leadData)
  });
  if (!res.ok) throw new Error('Failed to create lead');
  return res.json();
};

export const updateLeadStatus = async (token, leadId, newStatus, additionalData = {}) => {
  const res = await fetch(`${API_URL}/leads/${leadId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ lead_status: newStatus, ...additionalData })
  });
  
  if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || 'Failed to update lead status');
  }
  return res.json();
};

export const fetchLoans = async (token) => {
  const res = await fetch(`${API_URL}/loans/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch loans');
  return res.json();
};

export const recordPayment = async (token, loanId, amountDue) => {
  const res = await fetch(`${API_URL}/payments/record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ loan_id: loanId, amount_due: amountDue })
  });
  if (!res.ok) throw new Error('Failed to record payment');
  return res.json();
};

export const uploadDocument = async (token, leadId, file, documentType) => {
    const formData = new FormData();
    formData.append("lead_id", leadId);
    formData.append("document_type", documentType);
    formData.append("file", file);

    const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData,
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to upload document");
    }
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
