import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuditLogsPage from '../pages/AuditLogsPage';
import * as auditLogService from '../api/auditLog.service';

// Mock the audit log service module
jest.mock('../api/auditLog.service');

// Mock react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

// Mock useAuth context hook
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    logout: jest.fn(),
    currentUser: { id: 'admin-1', role: 'admin', name: 'Admin Test' }
  })
}));

// Mock useSocket context hook
jest.mock('../context/SocketContext', () => ({
  useSocket: () => ({
    connectionStatus: 'connected'
  })
}));

// Mock window.URL methods for downloads
const mockCreateObjectURL = jest.fn().mockReturnValue('mock-object-url');
const mockRevokeObjectURL = jest.fn();
beforeAll(() => {
  window.URL.createObjectURL = mockCreateObjectURL;
  window.URL.revokeObjectURL = mockRevokeObjectURL;
});

describe('AuditLogExport Component Frontend Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditLogService.getAuditLogs.mockResolvedValue({ page: 1, limit: 20, total: 0, pages: 1, logs: [] });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AuditLogsPage />
      </BrowserRouter>
    );
  };

  it('triggers CSV download with active filters and displays success banner', async () => {
    auditLogService.exportAuditLogsCSV.mockResolvedValue(new Blob(['csv-content'], { type: 'text/csv' }));
    renderComponent();

    // Wait for initial page loading
    await waitFor(() => expect(screen.getByText('Report Actions')).toBeInTheDocument());

    const csvButton = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(csvButton);

    // Verify it called the CSV export service with current filter parameters
    await waitFor(() => {
      expect(auditLogService.exportAuditLogsCSV).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '',
          action: '',
          role: '',
          entityType: '',
          sortBy: 'createdAt',
          sortOrder: 'DESC'
        })
      );
    });

    // Verify success banner is shown
    await waitFor(() => {
      expect(screen.getByText('Audit logs exported successfully as CSV.')).toBeInTheDocument();
    });
  });

  it('triggers PDF download with active filters and displays success banner', async () => {
    auditLogService.exportAuditLogsPDF.mockResolvedValue(new Blob(['pdf-content'], { type: 'application/pdf' }));
    renderComponent();

    await waitFor(() => expect(screen.getByText('Report Actions')).toBeInTheDocument());

    // Apply some filters in UI first
    const actionSelect = screen.getByRole('combobox', { name: /Action Type/i });
    fireEvent.change(actionSelect, { target: { value: 'LOGIN_SUCCESS' } });

    const pdfButton = screen.getByRole('button', { name: /Export PDF/i });
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(auditLogService.exportAuditLogsPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS'
        })
      );
    });

    // Verify success banner is shown
    await waitFor(() => {
      expect(screen.getByText('Audit logs exported successfully as PDF.')).toBeInTheDocument();
    });
  });

  it('disables export buttons while exporting and shows loading state', async () => {
    // Delay resolution to capture exporting loading state
    let resolveExport;
    const exportPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });
    auditLogService.exportAuditLogsCSV.mockReturnValue(exportPromise);

    renderComponent();

    await waitFor(() => expect(screen.getByText('Report Actions')).toBeInTheDocument());

    const csvButton = screen.getByRole('button', { name: /Export CSV/i });
    const pdfButton = screen.getByRole('button', { name: /Export PDF/i });
    
    fireEvent.click(csvButton);

    // Verify buttons are disabled
    expect(csvButton).toBeDisabled();
    expect(pdfButton).toBeDisabled();

    // Resolve service to cleanup
    resolveExport(new Blob(['content']));
    await waitFor(() => expect(csvButton).not.toBeDisabled());
  });

  it('handles export errors gracefully by displaying error banner', async () => {
    auditLogService.exportAuditLogsCSV.mockRejectedValue(new Error('Export compilation failed'));
    renderComponent();

    await waitFor(() => expect(screen.getByText('Report Actions')).toBeInTheDocument());

    const csvButton = screen.getByRole('button', { name: /Export CSV/i });
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to export CSV. Please try again.')).toBeInTheDocument();
    });
  });
});
