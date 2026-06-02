import { useState, useEffect } from 'react';
import { fetchLeads, createLead, updateLeadStatus } from '../api';
import { Plus, LayoutGrid, List as ListIcon, Activity } from 'lucide-react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

const PIPELINE_STAGES = [
  { id: 'new', title: 'New Leads' },
  { id: 'contacted', title: 'Contacted' },
  { id: 'under_review', title: 'Under Review' },
  { id: 'approved', title: 'Approved' },
  { id: 'disbursed', title: 'Disbursed' },
  { id: 'rejected', title: 'Rejected' },
];

function KanbanCard({ lead }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id.toString(),
    data: lead
  });
  const navigate = useNavigate();

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-background border border-white/10 rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
      onDoubleClick={() => navigate(`/leads/${lead.id}`)}
    >
      <h4 className="font-semibold text-text-main">{lead.first_name} {lead.last_name}</h4>
      <p className="text-xs text-text-muted mt-1 truncate">{lead.email}</p>
      {lead.loan_amount && (
        <span className="inline-block mt-2 text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
          ₹{lead.loan_amount.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function KanbanColumn({ id, title, leads }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div ref={setNodeRef} className={`glass-card p-4 min-w-[280px] w-72 flex-shrink-0 flex flex-col transition-colors ${isOver ? 'ring-2 ring-primary bg-white/5' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-text-main text-sm">{title}</h3>
        <span className="bg-white/10 text-text-muted text-xs px-2 py-0.5 rounded-full">{leads.length}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1 min-h-[150px]">
        {leads.map(lead => <KanbanCard key={lead.id} lead={lead} />)}
        {leads.length === 0 && (
          <div className="border border-dashed border-white/10 rounded-md p-4 text-center text-text-muted text-xs opacity-50">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}

const Leads = ({ token }) => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', city: '', loan_amount: ''
  });

  const loadLeads = async () => {
    try {
      const data = await fetchLeads(token);
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, [token]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const leadId = active.id;
    const newStatus = over.id;

    const lead = leads.find(l => l.id.toString() === leadId);
    if (!lead || lead.lead_status === newStatus) return;

    if (newStatus === 'approved') {
        if (!lead.loan_amount || !lead.rate || !lead.tenure || !lead.emi) {
            alert(`Financial parameters are required to approve a loan. Redirecting to ${lead.first_name}'s profile to execute the Term Sheet Calculator.`);
            navigate(`/leads/${lead.id}`);
            return;
        }
    }

    // Optimistic Update
    setLeads(prev => prev.map(l => l.id.toString() === leadId ? { ...l, lead_status: newStatus } : l));

    try {
      await updateLeadStatus(token, leadId, newStatus);
    } catch (err) {
      alert("Failed to move lead: " + err.message);
      // Revert on fail
      loadLeads();
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        loan_amount: formData.loan_amount ? parseFloat(formData.loan_amount) : null
      };
      await createLead(token, payload);
      setShowAddModal(false);
      setFormData({first_name: '', last_name: '', email: '', phone: '', city: '', loan_amount: ''});
      loadLeads();
    } catch (err) {
      alert("Failed to create lead");
    }
  };

  if (isLoading) return <div className="flex justify-center mt-20"><Activity className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Lead Pipeline</h1>
          <p className="text-text-muted mt-1">Manage prospects and track applications</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-surface p-1 rounded-lg border border-white/10">
            <button 
                onClick={() => setViewMode('kanban')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}
            >
                <LayoutGrid size={20} />
            </button>
            <button 
                onClick={() => setViewMode('table')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}
            >
                <ListIcon size={20} />
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Add Lead
          </button>
        </div>
      </header>

      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto custom-scrollbar pb-4 -mx-1 px-1">
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 h-full items-stretch">
              {PIPELINE_STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.lead_status === stage.id);
                return <KanbanColumn key={stage.id} id={stage.id} title={stage.title} leads={stageLeads} />;
              })}
            </div>
          </DndContext>
        </div>
      ) : (
        <div className="glass-card flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-text-muted text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">City</th>
                  <th className="p-4 font-medium">Requested Amt</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="p-4 font-medium text-text-main">{lead.first_name} {lead.last_name}</td>
                    <td className="p-4 text-text-muted">{lead.email}<br/><span className="text-xs">{lead.phone}</span></td>
                    <td className="p-4 text-text-muted">{lead.city || '-'}</td>
                    <td className="p-4 text-text-main font-medium">{lead.loan_amount ? `₹${lead.loan_amount.toLocaleString()}` : '-'}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-white/10 rounded text-xs capitalize text-text-main">{lead.lead_status.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">New Lead Application</h2>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="flex gap-4">
                <input required placeholder="First Name" className="input-field w-1/2" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                <input required placeholder="Last Name" className="input-field w-1/2" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
              <input required type="email" placeholder="Email Address" className="input-field w-full" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input placeholder="Phone Number" className="input-field w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <div className="flex gap-4">
                  <input placeholder="City" className="input-field w-1/2" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  <input type="number" placeholder="Req Amount (₹)" className="input-field w-1/2" value={formData.loan_amount} onChange={e => setFormData({...formData, loan_amount: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-text-muted hover:text-white transition">Cancel</button>
                <button type="submit" className="btn-primary">Create Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
