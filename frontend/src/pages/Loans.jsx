import { useState, useEffect } from 'react';
import { fetchLoans, createLoan, fetchClients, updateLoan } from '../api';
import { CreditCard, Plus, X, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const Loans = ({ token, user }) => {
  const [loans, setLoans] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', amount: '', interest_rate: '', status: 'pending' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loansData, clientsData] = await Promise.all([
        fetchLoans(token),
        fetchClients(token)
      ]);
      setLoans(loansData);
      setClients(clientsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createLoan(token, {
        client_id: parseInt(formData.client_id),
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate),
        status: formData.status
      });
      setIsModalOpen(false);
      setFormData({ client_id: '', amount: '', interest_rate: '', status: 'pending' });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (loanId, newStatus) => {
    try {
      await updateLoan(token, loanId, { status: newStatus });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle size={12}/> Active</span>;
      case 'closed': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20"><AlertCircle size={12}/> Closed</span>;
      default: return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><Clock size={12}/> Pending</span>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <CreditCard className="text-purple-400" /> {user?.role === 'customer' ? 'My Loans' : 'Loans'}
          </h1>
          <p className="text-text-muted mt-1">{user?.role === 'customer' ? 'Track your active and closed loans.' : 'Track and manage loan portfolios.'}</p>
        </div>
        {user?.role !== 'customer' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-lg shadow-purple-600/20 transition-all duration-200 flex items-center justify-center shrink-0"
          >
            <Plus size={18} className="mr-2" /> Issue Loan
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-surface/30">
                <th className="p-4 text-sm font-semibold text-text-muted">Client ID</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Amount</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Rate</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Start Date</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Status</th>
                {user?.role !== 'customer' && <th className="p-4 text-sm font-semibold text-text-muted text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted">
                    <Loader2 className="animate-spin mx-auto text-purple-400" size={24} />
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-muted">
                    No loans found. Create your first loan above.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-gray-800/50 hover:bg-surface/50 transition-colors">
                    <td className="p-4 text-text-main font-medium">#{loan.client_id}</td>
                    <td className="p-4 text-text-main">${loan.amount.toLocaleString()}</td>
                    <td className="p-4 text-text-muted">{loan.interest_rate}%</td>
                    <td className="p-4 text-text-muted">{loan.start_date}</td>
                    <td className="p-4">{getStatusBadge(loan.status)}</td>
                    {user?.role !== 'customer' && (
                      <td className="p-4 text-right space-x-2">
                         {loan.status === 'pending' && (
                           <button onClick={() => handleStatusChange(loan.id, 'active')} className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors">Approve</button>
                         )}
                         {loan.status === 'active' && (
                           <button onClick={() => handleStatusChange(loan.id, 'closed')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">Close</button>
                         )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-surface/30">
              <h3 className="text-xl font-bold">Issue New Loan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">Select Client</label>
                <select 
                  required 
                  className="input-premium appearance-none" 
                  value={formData.client_id} 
                  onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                >
                  <option value="" disabled>Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Amount ($)</label>
                  <input required type="number" min="0" step="100" className="input-premium" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Interest Rate (%)</label>
                  <input required type="number" min="0" step="0.1" className="input-premium" value={formData.interest_rate} onChange={(e) => setFormData({...formData, interest_rate: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-text-muted hover:bg-surface transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 text-sm px-6 rounded-lg transition-all">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
