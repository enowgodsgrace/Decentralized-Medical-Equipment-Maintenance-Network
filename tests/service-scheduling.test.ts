import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock implementation for testing Clarity contracts
const mockContractState = {
  lastServiceId: 0,
  services: new Map(),
  serviceHistory: new Map(),
  contractOwner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Example principal
  blockHeight: 100 // Mock block height
};

// Mock contract calls to other contracts
const mockContractCalls = {
  deviceRegistration: {
    getDevice: vi.fn()
  },
  technicianVerification: {
    getTechnician: vi.fn()
  }
};

// Mock contract functions
const serviceScheduling = {
  scheduleService: (deviceId, technicianId, scheduledDate, serviceType, notes, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    // Check if device exists
    if (!mockContractCalls.deviceRegistration.getDevice(deviceId)) {
      return { error: 404 };
    }
    
    // Check if technician exists
    if (!mockContractCalls.technicianVerification.getTechnician(technicianId)) {
      return { error: 404 };
    }
    
    const newId = mockContractState.lastServiceId + 1;
    const key = { serviceId: newId };
    const value = {
      deviceId,
      technicianId,
      scheduledDate,
      serviceType,
      status: 'scheduled',
      notes
    };
    
    mockContractState.services.set(JSON.stringify(key), value);
    mockContractState.lastServiceId = newId;
    
    return { success: newId };
  },
  
  updateServiceStatus: (serviceId, status, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const key = JSON.stringify({ serviceId });
    if (!mockContractState.services.has(key)) {
      return { error: 404 };
    }
    
    const service = mockContractState.services.get(key);
    service.status = status;
    mockContractState.services.set(key, service);
    
    return { success: true };
  },
  
  completeService: (serviceId, findings, partsReplaced, nextServiceDate, sender) => {
    if (sender !== mockContractState.contractOwner) {
      return { error: 403 };
    }
    
    const key = JSON.stringify({ serviceId });
    if (!mockContractState.services.has(key)) {
      return { error: 404 };
    }
    
    const service = mockContractState.services.get(key);
    if (service.status !== 'in-progress') {
      return { error: 400 };
    }
    
    // Update service status
    service.status = 'completed';
    mockContractState.services.set(key, service);
    
    // Record service history
    const historyKey = JSON.stringify({ deviceId: service.deviceId, serviceId });
    const historyValue = {
      completionDate: mockContractState.blockHeight,
      findings,
      partsReplaced,
      nextServiceDate
    };
    
    mockContractState.serviceHistory.set(historyKey, historyValue);
    
    return { success: true };
  },
  
  getService: (serviceId) => {
    const key = JSON.stringify({ serviceId });
    return mockContractState.services.get(key) || null;
  },
  
  getServiceHistory: (deviceId, serviceId) => {
    const key = JSON.stringify({ deviceId, serviceId });
    return mockContractState.serviceHistory.get(key) || null;
  }
};

describe('Service Scheduling Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockContractState.lastServiceId = 0;
    mockContractState.services = new Map();
    mockContractState.serviceHistory = new Map();
    
    // Reset mocks
    vi.resetAllMocks();
  });
  
  it('should schedule a service successfully', () => {
    // Setup mocks
    mockContractCalls.deviceRegistration.getDevice.mockReturnValue({ name: 'MRI Scanner' });
    mockContractCalls.technicianVerification.getTechnician.mockReturnValue({ name: 'John Doe' });
    
    const result = serviceScheduling.scheduleService(
        1, // Device ID
        1, // Technician ID
        1609459200, // Scheduled date
        'Maintenance',
        'Regular maintenance check',
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(1); // First service ID
    expect(mockContractState.services.size).toBe(1);
    
    const service = serviceScheduling.getService(1);
    expect(service).toEqual({
      deviceId: 1,
      technicianId: 1,
      scheduledDate: 1609459200,
      serviceType: 'Maintenance',
      status: 'scheduled',
      notes: 'Regular maintenance check'
    });
  });
  
  it('should fail to schedule a service for non-existent device', () => {
    // Setup mocks
    mockContractCalls.deviceRegistration.getDevice.mockReturnValue(null);
    mockContractCalls.technicianVerification.getTechnician.mockReturnValue({ name: 'John Doe' });
    
    const result = serviceScheduling.scheduleService(
        999, // Non-existent Device ID
        1,
        1609459200,
        'Maintenance',
        'Regular maintenance check',
        mockContractState.contractOwner
    );
    
    expect(result.error).toBe(404);
    expect(mockContractState.services.size).toBe(0);
  });
  
  it('should update service status successfully', () => {
    // Setup: schedule a service
    mockContractCalls.deviceRegistration.getDevice.mockReturnValue({ name: 'MRI Scanner' });
    mockContractCalls.technicianVerification.getTechnician.mockReturnValue({ name: 'John Doe' });
    
    serviceScheduling.scheduleService(
        1,
        1,
        1609459200,
        'Maintenance',
        'Regular maintenance check',
        mockContractState.contractOwner
    );
    
    const result = serviceScheduling.updateServiceStatus(
        1, // Service ID
        'in-progress',
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(true);
    
    const service = serviceScheduling.getService(1);
    expect(service.status).toBe('in-progress');
  });
  
  it('should complete a service successfully', () => {
    // Setup: schedule a service and set it to in-progress
    mockContractCalls.deviceRegistration.getDevice.mockReturnValue({ name: 'MRI Scanner' });
    mockContractCalls.technicianVerification.getTechnician.mockReturnValue({ name: 'John Doe' });
    
    serviceScheduling.scheduleService(
        1,
        1,
        1609459200,
        'Maintenance',
        'Regular maintenance check',
        mockContractState.contractOwner
    );
    
    serviceScheduling.updateServiceStatus(
        1,
        'in-progress',
        mockContractState.contractOwner
    );
    
    const result = serviceScheduling.completeService(
        1, // Service ID
        'No issues found',
        ['filter', 'lubricant'],
        1625097600, // Next service date
        mockContractState.contractOwner
    );
    
    expect(result.success).toBe(true);
    
    const service = serviceScheduling.getService(1);
    expect(service.status).toBe('completed');
    
    const history = serviceScheduling.getServiceHistory(1, 1);
    expect(history).toEqual({
      completionDate: mockContractState.blockHeight,
      findings: 'No issues found',
      partsReplaced: ['filter', 'lubricant'],
      nextServiceDate: 1625097600
    });
  });
  
  it('should fail to complete a service that is not in-progress', () => {
    // Setup: schedule a service but don't set it to in-progress
    mockContractCalls.deviceRegistration.getDevice.mockReturnValue({ name: 'MRI Scanner' });
    mockContractCalls.technicianVerification.getTechnician.mockReturnValue({ name: 'John Doe' });
    
    serviceScheduling.scheduleService(
        1,
        1,
        1609459200,
        'Maintenance',
        'Regular maintenance check',
        mockContractState.contractOwner
    );
    
    const result = serviceScheduling.completeService(
        1,
        'No issues found',
        ['filter', 'lubricant'],
        1625097600,
        mockContractState.contractOwner
    );
    
    expect(result.error).toBe(400);
    
    const service = serviceScheduling.getService(1);
    expect(service.status).toBe('scheduled'); // Status should remain unchanged
  });
});
