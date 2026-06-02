import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLead, uploadDocument, updateLeadStatus } from '../api';
import { FileText, Upload, CheckCircle, Calculator, Activity, AlertCircle, ArrowLeft } from 'lucide-react';

const LeadProfile = ({ token, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('Aadhaar Card');
  const [uploading, setUploading] = useState(false);

  // Term Calculator State
  const [calcParams, setCalcParams] = useState({ loan_amount: '', rate: '', tenure: '' });
  const [emiEstimate, setEmiEstimate] = useState(null);

  const REQUIRED_DOCS = ["Aadhaar Card", "PAN Card", "Bank Statement", "ITR"];

  const loadProfile = async () => {
    try {
      const data = await fetchLead(token, id);
      setLead(data);
      setCalcParams({
        loan_amount: data.loan_amount || '',
        rate: data.rate || '',
        tenure: data.tenure || ''
      });
      if (data.emi) setEmiEstimate(data.emi);
    } catch (err) {
      console.error(err);
      alert("Failed to load Lead profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [token, id]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadDocument(token, lead.id, selectedFile, docType);
      setSelectedFile(null);
      await loadProfile();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Basic Amortization / EMI Formula
  const calculateEMI = () => {
    const P = parseFloat(calcParams.loan_amount);
    const R_annual = parseFloat(calcParams.rate);
    const N = parseInt(calcParams.tenure, 10);

    if (!P || !R_annual || !N) {
      alert("Please fill Principal, Rate, and Tenure");
      return;
    }

    const r = R_annual / 12 / 100;
    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    setEmiEstimate(emi);
  };

  const handleApproveTerms = async () => {
    if (lead.lead_status !== 'under_review') return;
    if (!emiEstimate) {
      alert("Must run calculator before finalizing terms.");
      return;
    }

    try {
      await updateLeadStatus(token, lead.id, 'approved', {
        loan_amount: parseFloat(calcParams.loan_amount),
        rate: parseFloat(calcParams.rate),
        tenure: parseInt(calcParams.tenure, 10),
        emi: parseFloat(emiEstimate)
      });
      alert("Lead Successfully Approved and Loan Generated!");
      navigate('/leads');
    } catch (err) {
      alert("Approval Failed: " + err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center mt-20"><Activity className="animate-spin text-primary" size={32} /></div>;
  if (!lead) return <div className="text-center mt-20">Lead not found.</div>;

  const canApprove = lead.lead_status === 'under_review';

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 mb-6 pt-2">
        <button onClick={() => navigate('/leads')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="text-text-muted" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text-main">{lead.first_name} {lead.last_name}</h1>
          <p className="text-text-muted mt-1 uppercase text-sm tracking-wide">
            Status: <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">{lead.lead_status.replace('_', ' ')}</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Term Calculator View */}
        <div className="glass-card p-6 flex flex-col h-full border-l-4 border-yellow-500/50">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="text-yellow-400" />
            <h2 className="text-xl font-bold">Term Sheet Calculator</h2>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Requested Principal (INR)</label>
              <input
                type="number" className="input-field w-full"
                value={calcParams.loan_amount}
                onChange={e => setCalcParams({ ...calcParams, loan_amount: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="text-xs text-text-muted mb-1 block">Annual Rate (%)</label>
                <input
                  type="number" step="0.01" className="input-field w-full"
                  value={calcParams.rate}
                  onChange={e => setCalcParams({ ...calcParams, rate: e.target.value })}
                />
              </div>
              <div className="w-1/2">
                <label className="text-xs text-text-muted mb-1 block">Tenure (Months)</label>
                <input
                  type="number" className="input-field w-full"
                  value={calcParams.tenure}
                  onChange={e => setCalcParams({ ...calcParams, tenure: e.target.value })}
                />
              </div>
            </div>
            <button onClick={calculateEMI} className="w-full bg-surface py-2 rounded border border-white/10 hover:border-white/30 transition-colors mt-2 text-sm font-medium">
              Compute Expected Form
            </button>

            {emiEstimate && (
              <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <h3 className="text-emerald-400 text-sm font-medium">Estimated EMI</h3>
                <p className="text-2xl font-bold text-white mt-1">₹{Math.round(emiEstimate).toLocaleString()}/mo</p>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-white/5 space-y-3">
            {!canApprove && lead.lead_status !== 'approved' && lead.lead_status !== 'disbursed' && (
              <div className="flex items-start gap-2 bg-blue-500/10 p-3 rounded text-blue-300 text-sm">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p>Lead must be moved to <strong>"Under Review"</strong> phase before the underlying product can be generated.</p>
              </div>
            )}
            <button
              disabled={!canApprove}
              onClick={handleApproveTerms}
              className={`w-full py-3 rounded-lg font-bold shadow-lg transition-all ${canApprove ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-background' : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-60'}`}
            >
              {lead.lead_status === 'approved' ? 'ALREADY APPROVED' : 'Approve Terms & Generate Loan'}
            </button>
          </div>
        </div>

        {/* KYC Document Feed */}
        <div className="glass-card p-6 h-[600px] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="text-blue-400" />
            <h2 className="text-xl font-bold">KYC Control Center</h2>
          </div>

          <form onSubmit={handleUpload} className="bg-surface/50 p-4 rounded-xl border border-white/5 space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <select
                className="bg-transparent text-text-main text-sm outline-none w-1/2"
                value={docType}
                onChange={e => setDocType(e.target.value)}
              >
                {REQUIRED_DOCS.map(doc => <option key={doc} value={doc} className="bg-background">{doc}</option>)}
                <option value="Other" className="bg-background">Other Document</option>
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-text-muted mb-1 block">Physical File Upload (Max 10MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={e => setSelectedFile(e.target.files[0])}
                  className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2 rounded-full transition-colors shadow-lg shadow-blue-600/20"
              >
                {uploading ? <Activity size={20} className="animate-spin" /> : <Upload size={20} />}
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {lead.documents?.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <FileText size={48} className="mx-auto mb-3" />
                <p className="text-sm">No documentation uploaded yet</p>
              </div>
            ) : (
              lead.documents?.map(doc => (
                <div key={doc.id} className="flex justify-between items-center p-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded">
                      <FileText size={16} className="text-text-muted" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-text-main">{doc.document_type}</h4>
                      <p className="text-xs text-text-muted">Status: {doc.status}</p>
                    </div>
                  </div>
                  {doc.uploaded_at && (
                    <span className="text-xs text-text-muted">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeadProfile;
