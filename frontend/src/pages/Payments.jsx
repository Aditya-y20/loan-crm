import { useState, useEffect } from 'react';
import { fetchLoans, recordPayment } from '../api';
import { Activity, Plus, FileText } from 'lucide-react';

const Payments = ({ token, user }) => {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const loadDocs = async () => {
    try {
      const data = await fetchLoans(token);
      // Filter out rejected or pending loans. Only Approved/Active loans show in Payment Ledger
      setLoans(data.filter(l => l.status === 'active'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, [token]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedLoan || !payAmount) return;
    try {
      await recordPayment(token, selectedLoan.id, parseFloat(payAmount));
      setShowModal(false);
      setPayAmount('');
      setSelectedLoan(null);
      loadDocs(); // refresh running totals
    } catch (err) {
      alert("Failed to submit recorded payment.");
    }
  };

  if (isLoading) return <div className="flex justify-center mt-20"><Activity className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Global Ledger</h1>
          <p className="text-text-muted mt-1 text-sm">Manage Active Disbursements and record EMI tracks.</p>
        </div>
      </header>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-text-muted text-sm uppercase tracking-wider bg-surface/30">
                <th className="p-4 font-medium">Loan ID</th>
                <th className="p-4 font-medium">Principal & Terms</th>
                <th className="p-4 font-medium">Expected EMI</th>
                <th className="p-4 font-medium">Captured Revenue</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loans.map(loan => {
                  const collected = loan.payments.reduce((acc, p) => acc + p.amount_paid, 0);
                  
                  return (
                    <tr key={loan.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-sm text-text-muted">LD-{loan.id.toString().padStart(4, '0')}</td>
                      <td className="p-4">
                          <p className="font-bold text-text-main">₹{loan.amount.toLocaleString()}</p>
                          <p className="text-xs text-text-muted">{loan.tenure_months} months @ {loan.interest_rate}%</p>
                      </td>
                      <td className="p-4 text-emerald-400 font-medium">₹{Math.round(loan.emi_amount).toLocaleString()}/mo</td>
                      <td className="p-4 text-blue-400 font-medium">₹{Math.round(collected).toLocaleString()} <span className="text-xs text-text-muted font-normal ml-1">({loan.payments.length} splits)</span></td>
                      <td className="p-4 text-right">
                          <button 
                             onClick={() => { setSelectedLoan(loan); setPayAmount(Math.round(loan.emi_amount)); setShowModal(true); }}
                             className="text-xs border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors"
                          >
                              Record Hit
                          </button>
                      </td>
                    </tr>
                  );
              })}
              {loans.length === 0 && (
                  <tr>
                      <td colSpan="5" className="p-8 text-center opacity-50">
                          <FileText size={32} className="mx-auto mb-3 text-text-muted" />
                          <p className="text-sm">No active loan ledgers found. Approve some prospects via Pipeline.</p>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedLoan && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
         <div className="glass-card w-full max-w-sm p-6 border border-white/10 shadow-2xl">
           <h2 className="text-xl font-bold text-white mb-2">Record Payment</h2>
           <p className="text-xs text-text-muted mb-6">Target File: LD-{selectedLoan.id.toString().padStart(4, '0')}</p>
           
           <form onSubmit={handlePay} className="space-y-4">
             <div>
                 <label className="text-xs text-text-muted mb-1 block">Capital Sourced (INR)</label>
                 <input 
                     type="number" required autoFocus
                     className="input-field w-full text-lg" 
                     value={payAmount} 
                     onChange={e => setPayAmount(e.target.value)} 
                 />
             </div>
             
             <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
               <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-text-muted hover:text-white transition text-sm">Dismiss</button>
               <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium shadow-lg transition-colors text-sm">Lock Record</button>
             </div>
           </form>
         </div>
       </div>
      )}
    </div>
  );
};

export default Payments;
