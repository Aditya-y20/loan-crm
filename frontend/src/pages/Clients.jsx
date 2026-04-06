import { useState, useEffect } from 'react';
import { fetchClients, createClient } from '../api';
import { Users, Plus, X, Loader2 } from 'lucide-react';

const Clients = ({ token }) => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await fetchClients(token);
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createClient(token, formData);
      setIsModalOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', address: '' });
      loadClients();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <Users className="text-primary" /> Clients
          </h1>
          <p className="text-text-muted mt-1">Manage your customer database.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shrink-0"
        >
          <Plus size={18} className="mr-2" /> Add Client
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-surface/30">
                <th className="p-4 text-sm font-semibold text-text-muted">Name</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Email</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Phone</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-text-muted">
                    <Loader2 className="animate-spin mx-auto text-primary" size={24} />
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-text-muted">
                    No clients found. Add your first client above.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-800/50 hover:bg-surface/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                          {client.first_name[0]}{client.last_name[0]}
                        </div>
                        <span className="font-medium text-text-main">{client.first_name} {client.last_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-text-muted">{client.email}</td>
                    <td className="p-4 text-text-muted">{client.phone || '-'}</td>
                    <td className="p-4 text-text-muted max-w-[200px] truncate">{client.address || '-'}</td>
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
              <h3 className="text-xl font-bold">New Client</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">First Name</label>
                  <input required type="text" className="input-premium" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Last Name</label>
                  <input required type="text" className="input-premium" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Email</label>
                <input required type="email" className="input-premium" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Phone (Optional)</label>
                <input type="text" className="input-premium" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Address (Optional)</label>
                <input type="text" className="input-premium" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-text-muted hover:bg-surface transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
