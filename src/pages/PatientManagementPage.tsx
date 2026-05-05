import { useState, useEffect, useMemo } from 'react';
import {
  Search, Trash2, Edit2, Save, X, Users, ChevronUp, ChevronDown,
  ChevronsUpDown, Calendar, Package, UserCheck, AlertTriangle,
} from 'lucide-react';
import { UsageRecord } from '../types';
import { toast } from 'sonner';
import { deletePatientRecord, getPatientUsageHistory, updatePatientRecord } from '../services/patientService';

type SortField = 'patientName' | 'procedure' | 'itemsUsed' | 'date';
type SortDir = 'asc' | 'desc';

interface EditState {
  id: string;
  patientName: string;
  procedure: string;
}

export function PatientManagementPage() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    getPatientUsageHistory()
      .then(setRecords)
      .catch((error) => toast.error(error.message || 'Failed to load patient records.'));
  }, []);

  // --- Search + Sort ---
  const totalItemsUsed = (r: UsageRecord) =>
    r.items.reduce((sum, i) => sum + i.quantityUsed, 0);

  const itemNames = (r: UsageRecord) =>
    r.items.map((i) => i.productName).join(', ');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return records.filter((r) => {
      if (!q) return true;
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.patientId.toLowerCase().includes(q) ||
        r.procedure.toLowerCase().includes(q) ||
        itemNames(r).toLowerCase().includes(q)
      );
    });
  }, [records, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'patientName') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (sortField === 'procedure') {
        cmp = a.procedure.localeCompare(b.procedure);
      } else if (sortField === 'itemsUsed') {
        cmp = totalItemsUsed(a) - totalItemsUsed(b);
      } else {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // --- Edit ---
  const startEdit = (r: UsageRecord) => {
    setEditState({ id: r.id, patientName: r.patientName, procedure: r.procedure });
    setDeleteConfirm(null);
  };

  const cancelEdit = () => setEditState(null);

  const saveEdit = async () => {
    if (!editState) return;
    if (!editState.patientName.trim()) {
      toast.error('Patient name cannot be empty');
      return;
    }
    if (!editState.procedure.trim()) {
      toast.error('Procedure cannot be empty');
      return;
    }
    try {
      await updatePatientRecord(editState.id, {
        patientName: editState.patientName.trim(),
        procedure: editState.procedure.trim(),
      });

      setRecords(records.map((r) =>
        r.id === editState.id
          ? { ...r, patientName: editState.patientName.trim(), procedure: editState.procedure.trim() }
          : r
      ));
      setEditState(null);
      toast.success('Patient record updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update patient record.');
    }
  };

  // --- Delete ---
  const confirmDelete = (id: string) => {
    setDeleteConfirm(id);
    setEditState(null);
  };

  const cancelDelete = () => setDeleteConfirm(null);

  const executeDelete = async (id: string) => {
    try {
      await deletePatientRecord(id);
      setRecords(records.filter((r) => r.id !== id));
      setDeleteConfirm(null);
      toast.success('Patient record deleted.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete patient record.');
    }
  };

  // --- Sort Icon helper ---
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-gold-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-gold-600" />;
  };

  const ThSortable = ({
    field, label, className = '',
  }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-gold-600" />
            Patient Management
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Search, edit, and manage patient records — Admin only
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gold-50 border border-gold-200 text-gold-700 px-4 py-2 rounded-xl text-sm font-medium">
          <UserCheck className="w-4 h-4" />
          {records.length} total record{records.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, ID, procedure, or items used…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-500 mt-2">
            {sorted.length} result{sorted.length !== 1 ? 's' : ''} for &quot;{search}&quot;
          </p>
        )}
      </div>

      {/* Sort Pills (mobile-friendly shortcut) */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(
          [
            { field: 'patientName' as SortField, label: 'Name' },
            { field: 'procedure' as SortField, label: 'Procedure' },
            { field: 'itemsUsed' as SortField, label: 'Items Used' },
            { field: 'date' as SortField, label: 'Date' },
          ] as { field: SortField; label: string }[]
        ).map(({ field, label }) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border font-medium transition ${
              sortField === field
                ? 'bg-gold-600 text-white border-gold-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gold-400'
            }`}
          >
            Sort: {label}
            {sortField === field &&
              (sortDir === 'asc' ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              ))}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {search ? 'No records match your search.' : 'No patient records found.'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {search
                ? 'Try a different keyword.'
                : 'Records appear here once patient visits are logged from the Patient Usage page.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <ThSortable field="patientName" label="Patient Name" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Patient ID
                  </th>
                  <ThSortable field="procedure" label="Procedure" />
                  <ThSortable field="itemsUsed" label="Items Used" />
                  <ThSortable field="date" label="Date" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Recorded By
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((record) => {
                  const isEditing = editState?.id === record.id;
                  const isDeleting = deleteConfirm === record.id;

                  return (
                    <tr
                      key={record.id}
                      className={`transition ${
                        isEditing
                          ? 'bg-gold-50'
                          : isDeleting
                          ? 'bg-red-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Patient Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editState.patientName}
                            onChange={(e) =>
                              setEditState({ ...editState, patientName: e.target.value })
                            }
                            className="w-full px-2 py-1 border border-gold-300 rounded-md text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-900 text-sm">
                            {record.patientName}
                          </span>
                        )}
                      </td>

                      {/* Patient ID */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {record.patientId}
                      </td>

                      {/* Procedure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editState.procedure}
                            onChange={(e) =>
                              setEditState({ ...editState, procedure: e.target.value })
                            }
                            className="w-full px-2 py-1 border border-gold-300 rounded-md text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-gray-700 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-medium">
                            {record.procedure || '—'}
                          </span>
                        )}
                      </td>

                      {/* Items Used */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold-700 bg-gold-50 border border-gold-200 px-2 py-0.5 rounded-full w-fit">
                            <Package className="w-3 h-3" />
                            {totalItemsUsed(record)} units
                          </span>
                          <span className="text-xs text-gray-400 max-w-xs truncate">
                            {itemNames(record) || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(record.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Recorded By */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {record.recordedBy}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isDeleting ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Delete?
                            </span>
                            <button
                              onClick={() => executeDelete(record.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition font-medium"
                              aria-label="Confirm delete"
                            >
                              Yes
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded-lg transition font-medium"
                              aria-label="Cancel delete"
                            >
                              No
                            </button>
                          </div>
                        ) : isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={saveEdit}
                              className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition font-medium"
                              aria-label="Save changes"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1 px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded-lg transition font-medium"
                              aria-label="Cancel edit"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startEdit(record)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-gold-50 hover:bg-gold-100 text-gold-700 border border-gold-200 text-xs rounded-lg transition font-medium"
                              aria-label={`Edit ${record.patientName}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => confirmDelete(record.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs rounded-lg transition font-medium"
                              aria-label={`Delete ${record.patientName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {sorted.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
            <span>
              Showing {sorted.length} of {records.length} record{records.length !== 1 ? 's' : ''}
            </span>
            <span>
              Sorted by{' '}
              <span className="font-medium text-gray-700">
                {sortField === 'patientName'
                  ? 'Name'
                  : sortField === 'procedure'
                  ? 'Procedure'
                  : sortField === 'itemsUsed'
                  ? 'Items Used'
                  : 'Date'}
              </span>{' '}
              ({sortDir === 'asc' ? 'A → Z' : 'Z → A'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
