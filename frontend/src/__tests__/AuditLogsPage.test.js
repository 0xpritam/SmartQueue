import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuditLogsPage from '../pages/AuditLogsPage';
import * as auditLogService from '../api/auditLog.service';

// Mock the audit log service module
jest.mock('../api/auditLog.service');

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
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

describe('AuditLogsPage Component Tests', () => {
  const mockLogsResponse = {
    page: 1,
    limit: 20,
    total: 2,
    pages: 1,
    logs: [
      {
        id: 'log-1',
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: 'user-1',
        description: 'Admin logged in',
        role: 'admin',
        createdAt: '2026-07-10T00:00:00.000Z',
        ipAddress: '127.0.0.1',
        metadata: { browser: 'Chrome' },
        user: { name: 'Admin Test', email: 'admin@test.com' }
      },
      {
        id: 'log-2',
        action: 'BOOK_TICKET',
        entityType: 'Ticket',
        entityId: 'tkt-1',
        description: 'Booked ticket TKT-1',
        role: 'user',
        createdAt: '2026-07-10T01:00:00.000Z',
        ipAddress: '127.0.0.1',
        metadata: null,
        user: { name: 'Patient Test', email: 'patient@test.com' }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auditLogService.getAuditLogs.mockResolvedValue(mockLogsResponse);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AuditLogsPage />
      </BrowserRouter>
    );
  };

  it('renders initial state, statistics, and audit logs table successfully', async () => {
    renderComponent();

    // Verify loading state is shown initially
    expect(screen.getByText('Total Audit Logs')).toBeInTheDocument();

    // Wait for the table rows to populate
    await waitFor(() => {
      expect(screen.getByText('Admin logged in')).toBeInTheDocument();
      expect(screen.getByText('Booked ticket TKT-1')).toBeInTheDocument();
    });

    // Check statistics card total
    expect(screen.getByText('2')).toBeInTheDocument();

    // Check pagination counters
    expect(screen.getByText(/Showing 1 to 2 of 2 logs/)).toBeInTheDocument();
  });

  it('filters by search input with a debounce', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText('Admin logged in')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Action, description, or entity...');
    fireEvent.change(searchInput, { target: { value: 'cancel' } });

    // Verify debounce is active and immediate call is not made with new value
    expect(auditLogService.getAuditLogs).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: 'cancel' })
    );

    // Wait for 300ms debounce to trigger the service call
    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'cancel', page: 1 })
      );
    });
  });

  it('filters by action, role, and entity type select dropdowns', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText('Admin logged in')).toBeInTheDocument());

    // Trigger Action Type select change
    const actionSelect = screen.getByRole('combobox', { name: /Action Type/i });
    fireEvent.change(actionSelect, { target: { value: 'LOGIN_SUCCESS' } });

    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS', page: 1 })
      );
    });

    // Trigger Role select change
    const roleSelect = screen.getByRole('combobox', { name: /Role/i });
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: 'admin', page: 1 })
      );
    });

    // Trigger Entity Type select change
    const entitySelect = screen.getByRole('combobox', { name: /Entity Type/i });
    fireEvent.change(entitySelect, { target: { value: 'Ticket' } });

    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ entityType: 'Ticket', page: 1 })
      );
    });
  });

  it('triggers sorting changes correctly', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText('Admin logged in')).toBeInTheDocument());

    const sortSelect = screen.getByRole('combobox', { name: /Sort By/i });
    fireEvent.change(sortSelect, { target: { value: 'action' } });

    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'action' })
      );
    });

    const sortOrderToggle = screen.getByRole('button', { name: /DESC/i });
    fireEvent.click(sortOrderToggle);

    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortOrder: 'ASC' })
      );
    });
  });

  it('triggers pagination navigation correctly', async () => {
    auditLogService.getAuditLogs.mockResolvedValueOnce({
      page: 1,
      limit: 10,
      total: 15,
      pages: 2,
      logs: mockLogsResponse.logs
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText('Admin logged in')).toBeInTheDocument());

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });
  });

  it('opens and closes the view details modal on row selection', async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText('Admin logged in')).toBeInTheDocument());

    // Click on the first row to open modal
    const firstRow = screen.getByText('Admin logged in');
    fireEvent.click(firstRow);

    // Verify modal overlay details
    expect(screen.getByText('Audit Log Details')).toBeInTheDocument();
    expect(screen.getByText('Admin logged in')).toBeInTheDocument();
    expect(screen.getByText('admin-1')).toBeInTheDocument(); // ID in header subtext
    expect(screen.getByText(/"browser": "Chrome"/)).toBeInTheDocument(); // metadata JSON pre text

    // Click close button
    const closeBtn = screen.getByRole('button', { name: /Close details/i });
    fireEvent.click(closeBtn);

    // Verify modal is closed
    expect(screen.queryByText('Audit Log Details')).not.toBeInTheDocument();
  });

  it('renders empty state message when logs response is empty', async () => {
    auditLogService.getAuditLogs.mockResolvedValueOnce({
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
      logs: []
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No audit logs found matching your filters')).toBeInTheDocument();
    });
  });

  it('displays error banner and handles retries successfully', async () => {
    auditLogService.getAuditLogs.mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    auditLogService.getAuditLogs.mockResolvedValueOnce(mockLogsResponse);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Admin logged in')).toBeInTheDocument();
    });
  });
});
